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

    it.each([
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

    it.each([
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
      "removes global `%s` invocation with tagged template literal",
      funcName => {
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
      }
    );
  });
});
