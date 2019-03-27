import { NodePath } from "@babel/traverse";
import * as babel from "@babel/core";
import { Comment, BaseNode, File } from "@babel/types";

// Original Syntax
// need to be a block comment like eslint
//
//
// // This content will be safe.
//
// /* test-code-start ~~ */
//
// // This content will be removed.
//
// /* test-code-end ~~ */
//
// // This content will be safe.
//
//
// (~~ is optional string)
// If "end" does not appear after "start", this process removes all lines after "start"

interface Range {
  start: { number: number; comment: Comment };
  end: { number: number; comment?: Comment };
}

function collectRangesToRemove(
  programPath: NodePath,
  comments: Comment[],
  endOfFileNumber: number
): Range[] {
  const ranges: Partial<Range>[] = [];
  let isInRange = false;
  for (const comment of comments) {
    if (comment.value.includes("test-code-start")) {
      if (!isInRange) {
        ranges.push({ start: { number: comment.start, comment } });
        isInRange = true;
      }
    } else if (comment.value.includes("test-code-end")) {
      if (!isInRange) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw (programPath.hub as any).buildError(
          comment,
          "Invalid 'test-code-end' comment. 'test-code-start' should comes before 'test-code-end'."
        );
        // API hack
      }
      ranges[ranges.length - 1].end = { number: comment.end, comment };
      isInRange = false;
    }
  }
  if (isInRange && ranges.length > 0) {
    if (!ranges[ranges.length - 1].end) {
      ranges[ranges.length - 1].end = { number: endOfFileNumber as number };
    }
  }

  return ranges as Range[];
}

export default function(t: typeof babel.types, programPath: NodePath): void {
  const fileNode = programPath.parent as File;
  const comments = fileNode.comments as Comment[];

  // no comments
  if (comments.length === 0) {
    return;
  }

  const magicComments = comments
    .map((c, index) => ({ body: c, index }))
    .filter(c => c.body.type === "CommentBlock")
    .filter(c => c.body.value.match(/test-code-(start|end)/));

  const fileEndNumber = fileNode.end as number;

  const ranges = collectRangesToRemove(
    programPath,
    magicComments.map(c => c.body),
    fileEndNumber
  );

  programPath.traverse({
    enter(path: NodePath<BaseNode>) {
      const nodeStart = path.node.start as number;
      const nodeEnd = path.node.end as number;
      for (const range of ranges) {
        // check if it's in range
        if (range.start.number <= nodeStart && nodeEnd <= range.end.number) {
          path.remove();
          return;
        }
      }
    },
    exit(path: NodePath<BaseNode>) {
      // remove all magic comments
      // if the comment remains either leading or trailing, it remains in the output
      // Therefore, remove carefully with this method
      const leadingComments = path.node.leadingComments as Comment[];
      if (leadingComments) {
        for (const magicComment of magicComments) {
          const index = leadingComments.indexOf(magicComment.body);
          if (index >= 0) {
            leadingComments.splice(index);
          }
        }

        path.node.leadingComments = leadingComments;
      }

      const innerComments = path.node.innerComments as Comment[];
      if (innerComments) {
        for (const magicComment of magicComments) {
          const index = innerComments.indexOf(magicComment.body);
          if (index >= 0) {
            innerComments.splice(index);
          }
        }

        path.node.innerComments = innerComments;
      }

      const trailingComments = path.node.trailingComments as Comment[];
      if (trailingComments) {
        for (const magicComment of magicComments) {
          const index = trailingComments.indexOf(magicComment.body);
          if (index >= 0) {
            trailingComments.splice(index);
          }
        }

        path.node.trailingComments = trailingComments;
      }
    }
  });
}
