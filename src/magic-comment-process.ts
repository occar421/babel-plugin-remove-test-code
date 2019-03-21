import { NodePath } from "@babel/traverse";
import { collectDeclaredVariablesShallow } from "./utils";
import * as babel from "@babel/core";

export default function(t: typeof babel.types, programPath: NodePath): void {
  throw Error("Not Implemented");
}
