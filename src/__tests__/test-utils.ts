import * as babel from "@babel/core";
import removeTestCodePlugin from "../index";
import prettier from "prettier";
import { Target } from "../utils";

function normalize(code: string, parser: "babel"): string {
  return prettier.format(code, { parser }).replace(/\n+/g, "\n");
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toTransformInto(code: string): CustomMatcherResult;
      toThrowTransformError(error: string): CustomMatcherResult;
    }
  }
}

export function prelude(targets: Target[]) {
  return () =>
    jasmine.addMatchers({
      toTransformInto: () => ({
        compare(input: string, expected: string): jasmine.CustomMatcherResult {
          const parser = "babel";
          const result = babel.transform(input, {
            plugins: [[removeTestCodePlugin, { targets }]],
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
              plugins: [[removeTestCodePlugin, { targets }]],
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
}

type CodeFragment = string;

export function generateTestCode(fragments: CodeFragment[]): string {
  return fragments.join("\n");
}

export const fragments: { [key: string]: (...args: any) => CodeFragment } = {
  consoleLog: () => `console.log("a");`,
  normalTestInvocation: identifierName => `
${identifierName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`,
  eachTestInvocation: identifierName => `
${identifierName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`,
  eachTaggedTemplateTestInvocation: identifierName => `
${identifierName}\`
  arg     | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`
};
