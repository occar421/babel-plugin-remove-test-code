import { NodePath } from "@babel/traverse";
import { collectDeclaredVariablesShallow } from "./utils";
import * as babel from "@babel/core";

// Jest globals
// https://jestjs.io/docs/en/api

export default function(t: typeof babel.types, programPath: NodePath): void {
  let globalPaths = programPath.get("body");
  if (!Array.isArray(globalPaths)) {
    globalPaths = [globalPaths];
  }

  // finding user's declaration
  const globalVariables = collectDeclaredVariablesShallow(t, globalPaths);

  // finding test code
  for (let path of globalPaths) {
    if (t.isExpressionStatement(path.node)) {
      const expression = path.node.expression;

      // foo();
      if (t.isCallExpression(expression) && t.isIdentifier(expression.callee)) {
        const variableName = expression.callee.name;
        if (
          [
            "afterAll",
            "afterEach",
            "beforeAll",
            "beforeEach",
            "describe",
            "test",
            "it"
          ].includes(variableName)
        ) {
          const variablePath = globalVariables.get(variableName);
          if (variablePath) {
            throw variablePath.buildCodeFrameError(
              `Try using "${variableName}" but "${variableName}" is re-declared illegally.`
            );
          }

          path.remove();
          continue;
        }
      }

      // foo.bar();
      if (
        t.isCallExpression(expression) &&
        t.isMemberExpression(expression.callee)
      ) {
        const methodExpression = expression.callee;
        if (
          t.isIdentifier(methodExpression.object) &&
          t.isIdentifier(methodExpression.property)
        ) {
          const objectName = methodExpression.object.name;
          const propertyName = methodExpression.property.name;

          if (
            (["describe", "test", "it"].includes(objectName) &&
              (propertyName === "only" || propertyName === "skip")) ||
            (["test", "it"].includes(objectName) && propertyName === "todo")
          ) {
            // describe.only(name, fn);
            const variablePath = globalVariables.get(objectName);
            if (variablePath) {
              throw variablePath.buildCodeFrameError(
                `Try using "${objectName}.${propertyName}" but "${objectName}" is re-declared illegally.`
              );
            }

            path.remove();
            continue;
          }
        }
      }

      // foo.bar()();
      if (
        t.isCallExpression(expression) &&
        t.isCallExpression(expression.callee) &&
        t.isMemberExpression(expression.callee.callee)
      ) {
        const methodExpression = expression.callee.callee;
        if (
          t.isIdentifier(methodExpression.object) &&
          t.isIdentifier(methodExpression.property)
        ) {
          const objectName = methodExpression.object.name;
          const propertyName = methodExpression.property.name;

          if (
            ["describe", "test", "it"].includes(objectName) &&
            propertyName === "each"
          ) {
            // describe.each(table)(name, fn, timeout);
            const variablePath = globalVariables.get(objectName);
            if (variablePath) {
              throw variablePath.buildCodeFrameError(
                `Try using "${objectName}.${propertyName}" but "${objectName}" is re-declared illegally.`
              );
            }

            path.remove();
            continue;
          }
        }
      }

      // foo.bar``();
      if (
        t.isCallExpression(expression) &&
        t.isTaggedTemplateExpression(expression.callee) &&
        t.isMemberExpression(expression.callee.tag)
      ) {
        const methodExpression = expression.callee.tag;
        if (
          t.isIdentifier(methodExpression.object) &&
          t.isIdentifier(methodExpression.property)
        ) {
          const objectName = methodExpression.object.name;
          const propertyName = methodExpression.property.name;

          if (
            ["describe", "test", "it"].includes(objectName) &&
            propertyName === "each"
          ) {
            // describe.each`table`(name, fn, timeout);
            const variablePath = globalVariables.get(objectName);
            if (variablePath) {
              throw variablePath.buildCodeFrameError(
                `Try using "${objectName}.${propertyName}" but "${objectName}" is re-declared illegally.`
              );
            }

            path.remove();
            continue;
          }
        }
      }

      // foo.bar.buz()();
      if (
        t.isCallExpression(expression) &&
        t.isCallExpression(expression.callee) &&
        t.isMemberExpression(expression.callee.callee)
      ) {
        const methodExpression = expression.callee.callee;

        if (
          t.isMemberExpression(methodExpression.object) &&
          t.isIdentifier(methodExpression.object.object) &&
          t.isIdentifier(methodExpression.object.property) &&
          t.isIdentifier(methodExpression.property)
        ) {
          const objectName = methodExpression.object.object.name;
          const propertyName = methodExpression.object.property.name;
          const subPropertyName = methodExpression.property.name;

          if (
            ["describe", "test", "it"].includes(objectName) &&
            (propertyName === "only" || propertyName === "skip") &&
            subPropertyName === "each"
          ) {
            // describe.only.each(table)(name, fn, timeout);
            const variablePath = globalVariables.get(objectName);
            if (variablePath) {
              throw variablePath.buildCodeFrameError(
                `Try using "${objectName}.${propertyName}.${subPropertyName}" but "${objectName}" is re-declared illegally.`
              );
            }

            path.remove();
            continue;
          }
        }
      }

      // foo.bar.buz``();
      if (
        t.isCallExpression(expression) &&
        t.isTaggedTemplateExpression(expression.callee) &&
        t.isMemberExpression(expression.callee.tag)
      ) {
        const methodExpression = expression.callee.tag;

        if (
          t.isMemberExpression(methodExpression.object) &&
          t.isIdentifier(methodExpression.object.object) &&
          t.isIdentifier(methodExpression.object.property) &&
          t.isIdentifier(methodExpression.property)
        ) {
          const objectName = methodExpression.object.object.name;
          const propertyName = methodExpression.object.property.name;
          const subPropertyName = methodExpression.property.name;

          if (
            ["describe", "test", "it"].includes(objectName) &&
            (propertyName === "only" || propertyName === "skip") &&
            subPropertyName === "each"
          ) {
            // describe.only.each`table`(name, fn, timeout);
            const variablePath = globalVariables.get(objectName);
            if (variablePath) {
              throw variablePath.buildCodeFrameError(
                `Try using "${objectName}.${propertyName}.${subPropertyName}" but "${objectName}" is re-declared illegally.`
              );
            }

            path.remove();
            continue;
          }
        }
      }
    }
  }
}
