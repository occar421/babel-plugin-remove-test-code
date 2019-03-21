import { prelude, generateTestCode, fragments } from "../test-utils";

beforeAll(prelude);

describe("babel-plugin-remove-test-code for es & Jest", () => {
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
      generateTestCode([
        fragments.consoleLog(),
        fragments.normalTestInvocation(funcName)
      ])
    ).toTransformInto(generateTestCode([fragments.consoleLog()]));
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
        generateTestCode([
          fragments.consoleLog(),
          fragments.eachTestInvocation(funcName)
        ])
      ).toTransformInto(generateTestCode([fragments.consoleLog()]));
    });

    it("by tagged template literal", () => {
      expect(
        generateTestCode([
          fragments.consoleLog(),
          fragments.eachTaggedTemplateTestInvocation(funcName)
        ])
      ).toTransformInto(generateTestCode([fragments.consoleLog()]));
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
            fragments.consoleLog(),
            `const ${baseName} = (...args) => console.log(args);`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `const [${baseName}] = [(...args) => console.log(args)];`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `const { ...${baseName} } = { foo(...args) { console.log(args); } };`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `const [...${baseName}] = [(args) => console.log(args)];`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by variable assignment to \`${baseName}\``, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `${baseName} = (...args) => console.log(args);`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by variable assignment to \`${baseName}.foo\``, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `${baseName}.foo = (...args) => console.log(args);`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `${baseName}.foo.bar = (...args) => console.log(args);`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `[${baseName}] = [(...args) => console.log(args)];`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `({ ...${baseName} } = { foo(...args) { console.log(args); } });`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `[...${baseName}] = [(...args) => console.log(args)];`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );
      });

      it(`by function declaration \`${baseName}\``, () => {
        // declaration before test line
        expect(
          generateTestCode([
            fragments.consoleLog(),
            `function ${baseName}(...args) { console.log(args); }`,
            fragments.normalTestInvocation(funcName)
          ])
        ).toThrowTransformError(
          `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
        );

        // declaration after test line
        expect(
          generateTestCode([
            fragments.consoleLog(),
            fragments.normalTestInvocation(funcName),
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
              fragments.consoleLog(),
              `const ${baseName} = (...args) => console.log(args);`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const [${baseName}] = [(...args) => console.log(args)];`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const { ...${baseName} } = { foo(...args) { console.log(args); } };`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const [...${baseName}] = [(args) => console.log(args)];`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}\``, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `${baseName} = (...args) => console.log(args);`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo\``, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `${baseName}.foo = (...args) => console.log(args);`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `${baseName}.foo.bar = (...args) => console.log(args);`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `[${baseName}] = [(...args) => console.log(args)];`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `({ ...${baseName} } = { foo(...args) { console.log(args); } });`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `[...${baseName}] = [(...args) => console.log(args)];`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by function declaration \`${baseName}\``, () => {
          // declaration before test line
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `function ${baseName}(...args) { console.log(args); }`,
              fragments.eachTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );

          // declaration after test line
          expect(
            generateTestCode([
              fragments.consoleLog(),
              fragments.eachTestInvocation(funcName),
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
              fragments.consoleLog(),
              `const ${baseName} = (...args) => console.log(args);`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const { ${baseName} } = { ${baseName}(...args) { console.log(args); } };`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable declaration \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const [${baseName}] = [(...args) => console.log(args)];`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const { ...${baseName} } = { foo(...args) { console.log(args); } };`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element declaration \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `const [...${baseName}] = [(args) => console.log(args)];`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}\``, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `${baseName} = (...args) => console.log(args);`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo\``, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `${baseName}.foo = (...args) => console.log(args);`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by variable assignment to \`${baseName}.foo.bar\``, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `${baseName}.foo.bar = (...args) => console.log(args);`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `({ ${baseName} } = { ${baseName}(...args) { console.log(args); } });`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable assignment to \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `[${baseName}] = [(...args) => console.log(args)];`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by object pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `({ ...${baseName} } = { foo(...args) { console.log(args); } });`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by destructuring variable rest element assignment to \`${baseName}\` by array pattern`, () => {
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `[...${baseName}] = [(...args) => console.log(args)];`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );
        });

        it(`by function declaration \`${baseName}\``, () => {
          // declaration before test line
          expect(
            generateTestCode([
              fragments.consoleLog(),
              `function ${baseName}(...args) { console.log(args); }`,
              fragments.eachTaggedTemplateTestInvocation(funcName)
            ])
          ).toThrowTransformError(
            `Try using "${funcName}" but "${baseName}" is re-declared illegally.`
          );

          // declaration after test line
          expect(
            generateTestCode([
              fragments.consoleLog(),
              fragments.eachTaggedTemplateTestInvocation(funcName),
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
