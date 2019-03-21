import { NodePath } from "@babel/traverse";
import * as babel from "@babel/core";
// @ts-ignore
import { BaseComment, File } from "@babel/types";

// Original Syntax
// need to be a block comment like eslint
// /* test-code-start ~~ */
// /* test-code-end ~~ */
// (~~ is optional string)
// If "end" does not appear after "start", this process removes all lines after "start"

export default function(t: typeof babel.types, programPath: NodePath): void {
  const fileNode = programPath.parent as File;
  const comments = fileNode.comments as BaseComment[];

  // no comments
  if (comments.length === 0) {
    return;
  }

  throw Error("Not Implemented");
}
