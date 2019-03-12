import prettier from "prettier";
import * as babel from "@babel/core";
import removeTestCodePlugin from "../index";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      willTransformLike(code: string): CustomMatcherResult;
    }
  }
}

function normalize(code: string, parser: "babel"): string {
  return prettier.format(code, { parser }).replace(/\n+/g, "\n");
}

beforeAll(() => {
  jasmine.addMatchers({
    willTransformLike: () => ({
      compare(input: string, expected: string): jasmine.CustomMatcherResult {
        const parser = "babel";
        const result = babel.transform(input, {
          plugins: [removeTestCodePlugin],
          babelrc: false
        });
        if (!result || !result.code) {
          throw new Error("Failed to transform code.");
        }
        const actual = result.code;
        const normalizedActualCode = normalize(actual, parser);
        const normalizedExpectedCode = normalize(expected, parser);
        const pass = normalizedActualCode === normalizedExpectedCode;
        return {
          pass,
          message() {
            return `Expected input to transform into:
${normalizedExpectedCode}
--------------------------------
Instead, got:
${normalizedActualCode}`;
          }
        };
      }
    })
  });
});

describe("babel-plugin-remove-test-code for ecmascript", () => {
  it("transforms nothing if test code does not exists", () => {
    expect(`console.log("a");`).willTransformLike(`console.log("a");`);
  });

  describe("Jest", () => {
    it.each([
      "describe",
      "test",
      "it",
      "afterAll",
      "afterEach",
      "beforeAll",
      "beforeEach",
      "describe.only",
      "describe.skip",
      "test.only",
      "test.skip",
      "it.only",
      "it.skip"
    ])("removes global `%s` invocation", funcName => {
      expect(`
console.log("a");

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
        `
console.log("a");
`
      );
    });

    describe.each([
      "describe.each",
      "describe.only.each",
      "describe.skip.each",
      "test.each",
      "test.only.each",
      "test.skip.each",
      "it.each",
      "it.only.each",
      "it.skip.each"
    ])("removes global `%s` invocation", funcName => {
      it("by normal invocation", () => {
        expect(`
console.log("a");

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).willTransformLike(
          `
console.log("a");
`
        );
      });

      it("by tagged template literal", () => {
        expect(`
console.log("a");

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).willTransformLike(
          `
console.log("a");
`
        );
      });
    });

    describe("when it's declared", () => {
      describe.each([
        "describe",
        "test",
        "it",
        "afterAll",
        "afterEach",
        "beforeAll",
        "beforeEach"
      ])("does not remove global `%s` invocation", funcName => {
        it("by normal variable declaration", () => {
          expect(`
console.log("a");

const ${funcName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

const ${funcName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable declaration by object pattern", () => {
          expect(`
console.log("a");

const { ${funcName} } = { ${funcName}(...args) { console.log(args); } };

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

const { ${funcName} } = { ${funcName}(...args) { console.log(args); } };

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable declaration by array pattern", () => {
          expect(`
console.log("a");

const [${funcName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

const [${funcName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable rest element declaration by object pattern", () => {
          expect(`
console.log("a");

const { ...${funcName} } = { foo(...args) { console.log(args); } };

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

const { ...${funcName} } = { foo(...args) { console.log(args); } };

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable rest element declaration by array pattern", () => {
          expect(`
console.log("a");

const [...${funcName}] = [(args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

const [...${funcName}] = [(args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by variable assignment", () => {
          expect(`
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable assignment by object pattern", () => {
          expect(`
console.log("a");

({ ${funcName} } = { ${funcName}(...args) { console.log(args); } });

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

({ ${funcName} } = { ${funcName}(...args) { console.log(args); } });

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable assignment by array pattern", () => {
          expect(`
console.log("a");

[${funcName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

[${funcName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable rest element assignment by object pattern", () => {
          expect(`
console.log("a");

({ ...${funcName} } = { foo(...args) { console.log(args); } });

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

({ ...${funcName} } = { foo(...args) { console.log(args); } });

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by destructuring variable rest element assignment by array pattern", () => {
          expect(`
console.log("a");

[...${funcName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

[...${funcName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        });

        it("by function declaration", () => {
          // declaration before test line
          expect(`
console.log("a");

function ${funcName}(...args) {
  console.log(args);
}

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

function ${funcName}(...args) {
  console.log(args);
}

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );

          // declaration after test line
          expect(`
console.log("a");

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});

function ${funcName}(...args) {
  console.log(args);
}`).willTransformLike(
            `
console.log("a");

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});

function ${funcName}(...args) {
  console.log(args);
}`
          );
        });
      });

      it.each([
        "describe.only",
        "describe.skip",
        "test.only",
        "test.skip",
        "test.todo",
        "test.each",
        "it.only",
        "it.skip",
        "it.todo"
      ])(
        "does not remove global `%s` invocation by variable assignment",
        funcName => {
          expect(`
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
            `
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});
`
          );
        }
      );

      describe.each([
        "describe.each",
        "describe.only.each",
        "describe.skip.each",
        "test.each",
        "test.only.each",
        "test.skip.each",
        "it.each",
        "it.only.each",
        "it.skip.each"
      ])(
        "does not remove global `%s` invocation by variable assignment",
        funcName => {
          it("by normal invocation", () => {
            expect(`
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).willTransformLike(`
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`);
          });

          it("by tagged template literal", () => {
            expect(`
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).willTransformLike(`
console.log("a");

${funcName} = (...args) => console.log(args);

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`);
          });
        }
      );
    });
  });
});
