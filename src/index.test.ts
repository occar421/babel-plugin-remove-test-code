import prettier from "prettier";
import * as babel from "@babel/core";
import removeTestCodePlugin from "./index";

type Language = "ecmascript";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      willTransformLike(language: Language, code: string): CustomMatcherResult;
    }
  }
}

beforeAll(() => {
  jasmine.addMatchers({
    willTransformLike: () => ({
      compare(
        input: string,
        language: Language,
        expected: string
      ): jasmine.CustomMatcherResult {
        if (language === "ecmascript") {
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
        throw new Error("Unknown language option.");
      }
    })
  });
});

describe("babel-plugin-remove-test-code", () => {
  describe("for ecmascript", () => {
    it("transforms nothing if test code does not exists", () => {
      expect(`console.log("a");`).willTransformLike(
        "ecmascript",
        `console.log("a");`
      );
    });
  });
});
