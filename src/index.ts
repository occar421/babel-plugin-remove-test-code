// typings only
import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";

export default function(context: typeof babel): babel.PluginObj {
  const t = context.types;
  return {
    visitor: {
      ExpressionStatement(path: NodePath<any>) {
        if (!t.isProgram(path.parentPath.node)) {
          return;
        }
        // path is in root of the file

        const expression = path.node.expression;
        if (!t.isCallExpression(expression)) {
          return;
        }

        if (t.isIdentifier(expression.callee)) {
          // Jest
          // https://jestjs.io/docs/en/api
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
        } else if (t.isMemberExpression(expression.callee)) {
          const methodExpression = expression.callee;
          if (
            t.isIdentifier(methodExpression.object) &&
            t.isIdentifier(methodExpression.property)
          ) {
            const nameTokens = [
              methodExpression.object.name,
              methodExpression.property.name
            ];

            if (
              (nameTokens[0] === "describe" || nameTokens[0] === "test") &&
              (nameTokens[1] === "only" || nameTokens[1] === "skip")
            ) {
              // describe.only(name, fn);
              path.remove();
            } else if (nameTokens[0] === "test" && nameTokens[1] === "todo") {
              // test.todo(name);
              path.remove();
            }
          }
        } else if (
          t.isCallExpression(expression.callee) &&
          t.isMemberExpression(expression.callee.callee)
        ) {
          const methodExpression = expression.callee.callee;
          if (
            t.isIdentifier(methodExpression.object) &&
            t.isIdentifier(methodExpression.property)
          ) {
            const nameTokens = [
              methodExpression.object.name,
              methodExpression.property.name
            ];

            if (
              (nameTokens[0] === "describe" || nameTokens[0] === "test") &&
              nameTokens[1] === "each"
            ) {
              // describe.each(table)(name, fn, timeout);
              path.remove();
            }
          } else if (
            t.isMemberExpression(methodExpression.object) &&
            t.isIdentifier(methodExpression.object.object) &&
            t.isIdentifier(methodExpression.object.property) &&
            t.isIdentifier(methodExpression.property)
          ) {
            const nameTokens = [
              methodExpression.object.object.name,
              methodExpression.object.property.name,
              methodExpression.property.name
            ];

            if (
              (nameTokens[0] === "describe" || nameTokens[0] === "test") &&
              (nameTokens[1] === "only" || nameTokens[1] === "skip") &&
              nameTokens[2] === "each"
            ) {
              // describe.only.each(table)(name, fn, timeout);
              path.remove();
            }
          }
        } else if (
          t.isTaggedTemplateExpression(expression.callee) &&
          t.isMemberExpression(expression.callee.tag)
        ) {
          const methodExpression = expression.callee.tag;
          if (
            t.isIdentifier(methodExpression.object) &&
            t.isIdentifier(methodExpression.property)
          ) {
            const nameTokens = [
              methodExpression.object.name,
              methodExpression.property.name
            ];

            if (
              (nameTokens[0] === "describe" || nameTokens[0] === "test") &&
              nameTokens[1] === "each"
            ) {
              // describe.each`table`(name, fn, timeout);
              path.remove();
            }
          } else if (
            t.isMemberExpression(methodExpression.object) &&
            t.isIdentifier(methodExpression.object.object) &&
            t.isIdentifier(methodExpression.object.property) &&
            t.isIdentifier(methodExpression.property)
          ) {
            const nameTokens = [
              methodExpression.object.object.name,
              methodExpression.object.property.name,
              methodExpression.property.name
            ];

            if (
              (nameTokens[0] === "describe" || nameTokens[0] === "test") &&
              (nameTokens[1] === "only" || nameTokens[1] === "skip") &&
              nameTokens[2] === "each"
            ) {
              // describe.only.each`table`(name, fn, timeout);
              path.remove();
            }
          }
        }
      }
    }
  };
}
