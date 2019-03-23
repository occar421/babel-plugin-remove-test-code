import { prelude, generateTestCode, fragments } from "../test-utils";

// Using all test frameworks
beforeAll(prelude(["MagicComment"]));

describe("babel-plugin-remove-test-code for es & magic-comment", () => {
  it("removes rest of lines after 'test-code-start'", () => {
    expect(
      generateTestCode([
        fragments.consoleLog("a"),
        `/* test-code-start foo */`,
        fragments.consoleLog("b")
      ])
    ).toTransformInto(generateTestCode([fragments.consoleLog("a")]));
  });

  it("removes lines between 'test-code-start' and 'test-code-end'", () => {
    expect(
      generateTestCode([
        fragments.consoleLog("a"),
        `/* test-code-start foo */`,
        fragments.consoleLog("b"),
        `/* test-code-end foo */`,
        fragments.consoleLog("c")
      ])
    ).toTransformInto(
      generateTestCode([fragments.consoleLog("a"), fragments.consoleLog("c")])
    );
  });

  it("removes lines between the first 'test-code-start' and 'test-code-end'", () => {
    expect(
      generateTestCode([
        fragments.consoleLog("a"),
        `/* test-code-start foo */`,
        fragments.consoleLog("b"),
        `/* test-code-start foo */`,
        fragments.consoleLog("c"),
        `/* test-code-end foo */`,
        fragments.consoleLog("d")
      ])
    ).toTransformInto(
      generateTestCode([fragments.consoleLog("a"), fragments.consoleLog("d")])
    );
  });

  it("removes lines between the pair of 'test-code-start' and 'test-code-end'", () => {
    expect(
      generateTestCode([
        fragments.consoleLog("a"),
        `/* test-code-start foo */`,
        fragments.consoleLog("b"),
        `/* test-code-end foo */`,
        fragments.consoleLog("c"),
        `/* test-code-start foo */`,
        fragments.consoleLog("d"),
        `/* test-code-end foo */`,
        fragments.consoleLog("e")
      ])
    ).toTransformInto(
      generateTestCode([
        fragments.consoleLog("a"),
        fragments.consoleLog("c"),
        fragments.consoleLog("e")
      ])
    );
  });

  it("throws error if 'test-code-end' comes before 'test-code-start", () => {
    expect(
      generateTestCode([
        fragments.consoleLog("a"),
        `/* test-code-end foo */`,
        fragments.consoleLog("b"),
        `/* test-code-start foo */`,
        fragments.consoleLog("c")
      ])
    ).toThrowTransformError("Invalid");
  });
});
