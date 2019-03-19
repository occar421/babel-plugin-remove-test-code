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

type CodeFragment = string;

function generateTestCode(fragments: CodeFragment[]) {
  return fragments.join("\n");
}

function consoleLog(): CodeFragment {
  return `console.log("a");`;
}

function normalTestInvocation(identifierName: string): CodeFragment {
  return `
${identifierName}("b", () => {
  it("c", () => {
    expect("d").not.toBe("e");
  });
});`;
}

function eachTestInvocation(identifierName: string): CodeFragment {
  return `
${identifierName}([["a", "b"], ["c", "d"]])(
  "%p and %p are different",
  (arg, expected) => {
    it(\`\${arg} !== \${expected}\`, () => {
      expect(arg).not.toBe(expected);
    });
  }
);`;
}

function eachTaggedTemplateTestInvocation(
  identifierName: string
): CodeFragment {
  return `
${identifierName}\`
  arg     | expected
  \${"a"} | \${"b"}
  \${"c"} | \${"d"}
\`("$arg and $expected are different", ({ arg, expected }) => {
  it(\`\${arg} !== \${expected}\`, () => {
    expect(arg).not.toBe(expected);
  });
});`;
}

describe("babel-plugin-remove-test-code for ecmascript", () => {
  it("transforms nothing if test code does not exists", () => {
    expect(generateTestCode([consoleLog()])).toTransformInto(
      generateTestCode([consoleLog()])
    );
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
      expect(
        generateTestCode([consoleLog(), normalTestInvocation(funcName)])
      ).toTransformInto(generateTestCode([consoleLog()]));
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
        expect(
          generateTestCode([consoleLog(), eachTestInvocation(funcName)])
        ).toTransformInto(generateTestCode([consoleLog()]));
      });

      it("by tagged template literal", () => {
        expect(
          generateTestCode([
            consoleLog(),
            eachTaggedTemplateTestInvocation(funcName)
          ])
        ).toTransformInto(generateTestCode([consoleLog()]));
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
          expect(
            generateTestCode([
              consoleLog(),
              `const ${baseName} = (...args) => console.log(args);`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `const [${baseName}] = [(...args) => console.log(args)];`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `const { ...${baseName} } = { foo(...args) { console.log(args); } };`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `const [...${baseName}] = [(args) => console.log(args)];`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}\``, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `${baseName} = (...args) => console.log(args);`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo\``, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `${baseName}.foo = (...args) => console.log(args);`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `${baseName}.foo.bar = (...args) => console.log(args);`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `[${baseName}] = [(...args) => console.log(args)];`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `({ ...${baseName} } = { foo(...args) { console.log(args); } });`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              consoleLog(),
              `[...${baseName}] = [(...args) => console.log(args)];`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by function declaration \`${baseName}\``, () => {
          // declaration before test line
          expect(
            generateTestCode([
              consoleLog(),
              `function ${baseName}(...args) { console.log(args); }`,
              normalTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );

          // declaration after test line
          expect(
            generateTestCode([
              consoleLog(),
              normalTestInvocation(funcName),
              `function ${baseName}(...args) { console.log(args); }`
            ])
          ).toThrowTransformError(
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
            expect(
              generateTestCode([
                consoleLog(),
                `const ${baseName} = (...args) => console.log(args);`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const [${baseName}] = [(...args) => console.log(args)];`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const { ...${baseName} } = { foo(...args) { console.log(args); } };`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const [...${baseName}] = [(args) => console.log(args)];`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `${baseName} = (...args) => console.log(args);`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `${baseName}.foo = (...args) => console.log(args);`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `${baseName}.foo.bar = (...args) => console.log(args);`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `[${baseName}] = [(...args) => console.log(args)];`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `({ ...${baseName} } = { foo(...args) { console.log(args); } });`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `[...${baseName}] = [(...args) => console.log(args)];`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by function declaration \`${baseName}\``, () => {
            // declaration before test line
            expect(
              generateTestCode([
                consoleLog(),
                `function ${baseName}(...args) { console.log(args); }`,
                eachTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );

            // declaration after test line
            expect(
              generateTestCode([
                consoleLog(),
                eachTestInvocation(funcName),
                `function ${baseName}(...args) { console.log(args); }`
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });
        });

        describe("by tagged template literal", () => {
          it(`by normal variable declaration \`${baseName}\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const ${baseName} = (...args) => console.log(args);`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const [${baseName}] = [(...args) => console.log(args)];`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const { ...${baseName} } = { foo(...args) { console.log(args); } };`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `const [...${baseName}] = [(args) => console.log(args)];`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `${baseName} = (...args) => console.log(args);`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `${baseName}.foo = (...args) => console.log(args);`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `${baseName}.foo.bar = (...args) => console.log(args);`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `[${baseName}] = [(...args) => console.log(args)];`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `({ ...${baseName} } = { foo(...args) { console.log(args); } });`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
            expect(
              generateTestCode([
                consoleLog(),
                `[...${baseName}] = [(...args) => console.log(args)];`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });

          it(`by function declaration \`${baseName}\``, () => {
            // declaration before test line
            expect(
              generateTestCode([
                consoleLog(),
                `function ${baseName}(...args) { console.log(args); }`,
                eachTaggedTemplateTestInvocation(funcName)
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );

            // declaration after test line
            expect(
              generateTestCode([
                consoleLog(),
                eachTaggedTemplateTestInvocation(funcName),
                `function ${baseName}(...args) { console.log(args); }`
              ])
            ).toThrowTransformError(
              `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
            );
          });
        });
      });
    });
  });
});
