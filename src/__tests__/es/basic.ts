import { prelude, generateTestCode, fragments } from "../test-utils";

beforeAll(prelude);

describe("babel-plugin-remove-test-code for es, basic tests", () => {
  it("transforms nothing if test code does not exists", () => {
    expect(generateTestCode([fragments.consoleLog()])).toTransformInto(
      generateTestCode([fragments.consoleLog()])
    );
  });
});
