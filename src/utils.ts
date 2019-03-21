import * as babel from "@babel/core";
import { NodePath } from "@babel/traverse";
import {
  Expression,
  ObjectProperty,
  PatternLike,
  RestElement,
  VariableDeclarator
} from "@babel/types";

export function collectDeclaredVariablesShallow(
  t: typeof babel.types,
  paths: NodePath[]
): Map<string, NodePath> {
  const declaredNames = new Map();
  for (let path of paths) {
    if (t.isFunctionDeclaration(path.node)) {
      if (path.node.id !== null) {
        // function foo() { ??? }
        declaredNames.set(path.node.id.name, path.get("id"));
      }
      continue;
    }
    if (t.isVariableDeclaration(path.node)) {
      path.node.declarations.forEach(
        (decl: VariableDeclarator, declIndex: number) => {
          if (t.isIdentifier(decl.id)) {
            // const foo = ???;
            declaredNames.set(
              decl.id.name,
              path.get(`declarations.${declIndex}`)
            );
          } else if (t.isObjectPattern(decl.id)) {
            decl.id.properties.forEach(
              (prop: RestElement | ObjectProperty, propIndex: number) => {
                if (t.isProperty(prop) && t.isIdentifier(prop.value)) {
                  // const { foo } = ???;
                  // const { foo: bar } = ???;
                  declaredNames.set(
                    prop.value.name,
                    path.get(
                      `declarations.${declIndex}.id.properties.${propIndex}`
                    )
                  );
                } else if (
                  t.isProperty(prop) &&
                  t.isAssignmentPattern(prop.value) &&
                  t.isIdentifier(prop.value.left)
                ) {
                  // const { foo = 1 } = ???;
                  // const { foo: bar = 1 } = ???;
                  declaredNames.set(
                    prop.value.left.name,
                    path.get(
                      `declarations.${declIndex}.id.properties.${propIndex}.value.left`
                    )
                  );
                } else if (
                  t.isRestElement(prop) &&
                  t.isIdentifier(prop.argument)
                ) {
                  // const { ...foo } = ???;
                  declaredNames.set(
                    prop.argument.name,
                    path.get(
                      `declarations.${declIndex}.id.properties.${propIndex}.argument`
                    )
                  );
                }
              }
            );
          } else if (t.isArrayPattern(decl.id)) {
            decl.id.elements.forEach((elem: PatternLike, elemIndex: number) => {
              if (t.isIdentifier(elem)) {
                // const [foo] = ???;
                declaredNames.set(
                  elem.name,
                  path.get(`declarations.${declIndex}.id.elements.${elemIndex}`)
                );
              } else if (
                t.isAssignmentPattern(elem) &&
                t.isIdentifier(elem.left)
              ) {
                // const [foo = 1] = ???;
                declaredNames.set(
                  elem.left.name,
                  path.get(
                    `declarations.${declIndex}.id.elements.${elemIndex}.left`
                  )
                );
              } else if (
                t.isRestElement(elem) &&
                t.isIdentifier(elem.argument)
              ) {
                // const [...foo] = ???;
                declaredNames.set(
                  elem.argument.name,
                  path.get(
                    `declarations.${declIndex}.id.elements.${elemIndex}.argument`
                  )
                );
              }
            });
          }
        }
      );
    }
    if (
      t.isExpressionStatement(path.node) &&
      t.isAssignmentExpression(path.node.expression)
    ) {
      const assignExpression = path.node.expression;
      if (t.isIdentifier(assignExpression.left)) {
        // foo = ???;
        declaredNames.set(
          assignExpression.left.name,
          path.get(`expression.left`)
        );
      } else if (t.isObjectPattern(assignExpression.left)) {
        assignExpression.left.properties.forEach(
          (prop: RestElement | ObjectProperty, propIndex: number) => {
            if (t.isProperty(prop) && t.isIdentifier(prop.value)) {
              // ({ foo } = ???);
              // ({ foo: bar } = ???);
              declaredNames.set(
                prop.value.name,
                path.get(`expression.left.properties.${propIndex}.value`)
              );
            } else if (
              t.isProperty(prop) &&
              t.isAssignmentPattern(prop.value) &&
              t.isIdentifier(prop.value.left)
            ) {
              // ({ foo = 1 } = ???);
              // ({ foo: bar = 1 } = ???);
              declaredNames.set(
                prop.value.left.name,
                path.get(`expression.left.properties.${propIndex}.value.left`)
              );
            } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
              // ({ ...foo } = ???);
              declaredNames.set(
                prop.argument.name,
                path.get(`expression.left.properties.${propIndex}.argument`)
              );
            }
          }
        );
      } else if (t.isArrayPattern(assignExpression.left)) {
        assignExpression.left.elements.forEach(
          (elem: PatternLike, elemIndex: number) => {
            if (t.isIdentifier(elem)) {
              // [foo] = ???;
              declaredNames.set(
                elem.name,
                path.get(`expression.left.elements.${elemIndex}`)
              );
            } else if (
              t.isAssignmentPattern(elem) &&
              t.isIdentifier(elem.left)
            ) {
              // [foo = 1] = ???;
              declaredNames.set(
                elem.left.name,
                path.get(`expression.left.elements.${elemIndex}.left`)
              );
            } else if (t.isRestElement(elem) && t.isIdentifier(elem.argument)) {
              // [...foo] = ???;
              declaredNames.set(
                elem.argument.name,
                path.get(`expression.left.elements.${elemIndex}.argument`)
              );
            }
          }
        );
      } else if (t.isMemberExpression(assignExpression.left)) {
        let member: Expression = assignExpression.left;

        while (true) {
          if (!("object" in member)) {
            throw path.buildCodeFrameError(
              "Not supported. Please report this to fix it."
            );
          } else if (t.isIdentifier(member.object)) {
            // x
            break;
          } else if (t.isMemberExpression(member.object)) {
            // x.foo
            member = member.object;
          } else if (t.isCallExpression(member.object)) {
            // x()
            member = member.object.callee;
          } else if (t.isAssignmentPattern(member.object)) {
            // (foo = x)
            // TODO: (x = foo) pattern
            member = member.object.right;
          } else {
            throw path.buildCodeFrameError(
              "Not supported. Please report this to fix it."
            );
          }
        }

        declaredNames.set(
          member.object.name,
          path.get(`expression.left.object`)
        );
      }
      continue;
    }
  }

  return declaredNames;
}

const supportedTargets = ["Jest", "MagicComment"] as ["Jest", "MagicComment"]; // as const

type U<T extends unknown[]> = T[number]; // tuple -> union

export type Target = U<typeof supportedTargets>;

export function isValidOptions(
  options: object
): options is {
  targets?: Target[];
} {
  // @ts-ignore
  if (options.targets) {
    // @ts-ignore
    const targets = options.targets as unknown;
    if (!Array.isArray(targets) || targets.some(t => typeof t !== "string")) {
      throw new Error(`"targets" option should be an array of string.`);
    }

    if (targets.length <= 0) {
      throw new Error(`"targets" should not be empty.`);
    }

    for (const t of targets) {
      if (!supportedTargets.includes(t)) {
        throw new Error(`target option "${t}" is not supported.`);
      }
    }

    return true;
  } else {
    // use default options
    return false;
  }
}
