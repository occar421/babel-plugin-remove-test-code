/** @jsx jsx */
import { jsx, css } from "@emotion/core";
import { useState } from "react";

const style = css`
  color: hotpink;
`;

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div css={style}>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <span>{count}</span>
    </div>
  );
};

export default Counter;

/* test-code-start */
console.log(global);

import { render, fireEvent } from "react-testing-library";
it("renders 0 then 1 after a click", () => {
  const { getByText, queryByText } = render(<Counter />);
  expect(getByText("0")).toBeDefined();
  expect(queryByText("1")).toBeNull();
  fireEvent.click(getByText("+"));
  expect(queryByText("0")).toBeNull();
  expect(getByText("1")).toBeDefined();
});
