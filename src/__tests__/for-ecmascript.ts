import prettier from "prettier";
import * as babel from "@babel/core";
import removeTestCodePlugin from "../index";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toTransformInto(code: string): CustomMatcherResult;
      toThrowTransformError(error: string): CustomMatcherResult;
    }
  }
}

function normalize(code: string, parser: "babel"): string {
  return prettier.format(code, { parser }).replace(/\n+/g, "\n");
}

beforeAll(() => {
  jasmine.addMatchers({
    toTransformInto: () => ({
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
    }),
    toThrowTransformError: () => ({
      compare(
        input: string,
        expectedError: string
      ): jasmine.CustomMatcherResult {
        try {
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
          return {
            pass: false,
            message() {
              return `Expected transform to throw:
${expectedError}
--------------------------------
Instead, got normal output:
${normalizedActualCode}`;
            }
          };
        } catch (error) {
          return {
            pass:
              error instanceof SyntaxError &&
              error.message.includes(expectedError),
            message() {
              return `Expected:
${expectedError}
but got:
${error.message}`;
            }
          };
        }
      }
    })
  });
});

describe("babel-plugin-remove-test-code for ecmascript", () => {
  it("transforms nothing if test code does not exists", () => {
    expect(`console.log("a");`).toTransformInto(`console.log("a");`);
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
});`).toTransformInto(
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
);`).toTransformInto(
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
});`).toTransformInto(
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
        "beforeEach",
        "describe.only",
        "describe.skip",
        "test.only",
        "test.skip",
        "test.todo",
        "it.only",
        "it.skip",
        "it.todo"
      ])("throws error on global `%s` invocation", funcName => {
        const baseName = funcName.split(".")[0];

        it(`by normal variable declaration \`${baseName}\``, () => {
          expect(`
console.log("a");

const ${baseName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
          expect(`
console.log("a");

const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
          expect(`
console.log("a");

const [${baseName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
          expect(`
console.log("a");

const { ...${baseName} } = { foo(...args) { console.log(args); } };

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
          expect(`
console.log("a");

const [...${baseName}] = [(args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}\``, () => {
          expect(`
console.log("a");

${baseName} = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo\``, () => {
          expect(`
console.log("a");

${baseName}.foo = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
          expect(`
console.log("a");

${baseName}.foo.bar = (...args) => console.log(args);

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
          expect(`
console.log("a");

({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
          expect(`
console.log("a");

[${baseName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
          expect(`
console.log("a");

({ ...${baseName} } = { foo(...args) { console.log(args); } });

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
          expect(`
console.log("a");

[...${baseName}] = [(...args) => console.log(args)];

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by function declaration \`${baseName}\``, () => {
          // declaration before test line
          expect(`
console.log("a");

function ${baseName}(...args) {
  console.log(args);
}

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );

          // declaration after test line
          expect(`
console.log("a");

${funcName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});

function ${baseName}(...args) {
  console.log(args);
}`).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });
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
      ])("throws error on global `%s` invocation", funcName => {
        const baseName = funcName.split(".")[0];

        describe("by normal invocation", () => {
          it(`by normal variable declaration \`${baseName}\``, () => {
            expect(`
console.log("a");

const ${baseName} = (...args) => console.log(args);

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

const [${baseName}] = [(...args) => console.log(args)];

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

const { ...${baseName} } = { foo(...args) { console.log(args); } };

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

const [...${baseName}] = [(args) => console.log(args)];

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}\``, () => {
            expect(`
console.log("a");

${baseName} = (...args) => console.log(args);

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo\``, () => {
            expect(`
console.log("a");

${baseName}.foo = (...args) => console.log(args);

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
            expect(`
console.log("a");

${baseName}.foo.bar = (...args) => console.log(args);

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

[${baseName}] = [(...args) => console.log(args)];

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

({ ...${baseName} } = { foo(...args) { console.log(args); } });

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

[...${baseName}] = [(...args) => console.log(args)];

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by function declaration \`${baseName}\``, () => {
            // declaration before test line
            expect(`
console.log("a");

function ${baseName}(...args) {
  console.log(args);
}

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );

            // declaration after test line
            expect(`
console.log("a");

${funcName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);

function ${baseName}(...args) {
  console.log(args);
}`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });
        });

        describe("by tagged template literal", () => {
          it(`by normal variable declaration \`${baseName}\``, () => {
            expect(`
console.log("a");

const ${baseName} = (...args) => console.log(args);

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

const [${baseName}] = [(...args) => console.log(args)];

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

const { ...${baseName} } = { foo(...args) { console.log(args); } };

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

const [...${baseName}] = [(args) => console.log(args)];

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}\``, () => {
            expect(`
console.log("a");

${baseName} = (...args) => console.log(args);

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo\``, () => {
            expect(`
console.log("a");

${baseName}.foo = (...args) => console.log(args);

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
            expect(`
console.log("a");

${baseName}.foo.bar = (...args) => console.log(args);

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

[${baseName}] = [(...args) => console.log(args)];

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
            expect(`
console.log("a");

({ ...${baseName} } = { foo(...args) { console.log(args); } });

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
            expect(`
console.log("a");

[...${baseName}] = [(...args) => console.log(args)];

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by function declaration \`${baseName}\``, () => {
            // declaration before test line
            expect(`
console.log("a");

function ${baseName}(...args) {
  console.log(args);
}

${funcName}\`
  arg    | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );

            // declaration after test line
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
});

function ${baseName}(...args) {
  console.log(args);
}`).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });
        });
      });
    });
  });
});
