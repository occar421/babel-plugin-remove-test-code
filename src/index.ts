import * as babel from "@babel/core";

export default function(context: typeof babel): babel.PluginObj {
  const t = context.types;
  return {
    visitor: {
      ExpressionStatement(path: any) {
        if (!t.isProgram(path.parentPath.node)) {
          return;
        }

        const expression = path.node.expression;
        if (!t.isCallExpression(expression)) {
          return;
        }

        if (!t.isIdentifier(expression.callee)) {
          return;
        }

        // Jest
        // https://jestjs.io/docs/en/api
        // TODO: functions like `describe.only`
        // TODO: when `describe` variable exists
        if (
          [
            "afterAll",
            "afterEach",
            "beforeAll",
            "beforeEach",
            "describe",
            "test"
          ].includes(expression.callee.name)
        ) {
          path.remove();
        }
      }
    }
  };
}
