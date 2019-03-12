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
        const normalizedActualCode = prettier.format(actual, { parser });
        const normalizedExpectedCode = prettier.format(expected, {
          parser
        });
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

  it("removes global `describe` invocation in the file root", () => {
    expect(`
console.log("a");

describe("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `test` invocation in the file root", () => {
    expect(`
console.log("a");

test("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `afterAll` invocation in the file root", () => {
    expect(`
console.log("a");

afterAll(() => {
  console.log("b");
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `afterEach` invocation in the file root", () => {
    expect(`
console.log("a");

afterEach(() => {
  console.log("b");
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `beforeAll` invocation in the file root", () => {
    expect(`
console.log("a");

beforeAll(() => {
  console.log("b");
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `beforeEach` invocation in the file root", () => {
    expect(`
console.log("a");

beforeEach(() => {
  console.log("b");
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `describe.each` invocation in the file root", () => {
    expect(`
console.log("a");

describe.each([["a", "b"], ["c", "d"]])(
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

  it("removes global `describe.each` with tagged template liberal invocation in the file root", () => {
    expect(`
console.log("a");

describe.each\`
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

  it("removes global `describe.only` invocation in the file root", () => {
    expect(`
console.log("a");

describe.only("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `describe.only.each` invocation in the file root", () => {
    expect(`
console.log("a");

describe.only.each([["a", "b"], ["c", "d"]])(
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

  it("removes global `describe.only.each` with tagged template liberal invocation in the file root", () => {
    expect(`
console.log("a");

describe.only.each\`
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

  it("removes global `describe.skip` invocation in the file root", () => {
    expect(`
console.log("a");

describe.skip("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `describe.skip.each` invocation in the file root", () => {
    expect(`
console.log("a");

describe.skip.each([["a", "b"], ["c", "d"]])(
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

  it("removes global `describe.skip.each` with tagged template liberal invocation in the file root", () => {
    expect(`
console.log("a");

describe.skip.each\`
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

  it("removes global `test.each` invocation in the file root", () => {
    expect(`
console.log("a");

test.each([["a", "b"], ["c", "d"]])(
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

  it("removes global `test.each` with tagged template liberal invocation in the file root", () => {
    expect(`
console.log("a");

test.each\`
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

  it("removes global `test.only` invocation in the file root", () => {
    expect(`
console.log("a");

test.only("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `test.only.each` invocation in the file root", () => {
    expect(`
console.log("a");

test.only.each([["a", "b"], ["c", "d"]])(
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

  it("removes global `test.only.each` with tagged template liberal invocation in the file root", () => {
    expect(`
console.log("a");

test.only.each\`
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

  it("removes global `test.skip` invocation in the file root", () => {
    expect(`
console.log("a");

test.skip("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`).willTransformLike(
      `
console.log("a");
`
    );
  });

  it("removes global `test.skip.each` invocation in the file root", () => {
    expect(`
console.log("a");

test.skip.each([["a", "b"], ["c", "d"]])(
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

  it("removes global `test.skip.each` with tagged template liberal invocation in the file root", () => {
    expect(`
console.log("a");

test.skip.each\`
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

  it("removes global `test.todo` invocation in the file root", () => {
    expect(`
console.log("a");

test.todo("b")`).willTransformLike(
      `
console.log("a");
`
    );
  });
});
