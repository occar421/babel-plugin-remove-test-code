/** @jsx jsx */
import { jsx, css } from "@emotion/core";
import { useState } from "react";

const style = css`
  color: hotpink;
`;

// don't need to `export` only for the test (happy TDDing)
function complexCalculation(number) {
  // magic
  return number;
}

// don't need to `export` only for the test (happy TDDing)
const InternalIndicator = ({ number } = { number: 0 }) => {
  return <span>{complexCalculation(number)}</span>;
};

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div css={style}>
      <button onClick={() => setCount(c => c + 1)}>+</button>
      <InternalIndicator number={count} />
    </div>
  );
};

export default Counter;

/* test-code-start */
import { render, fireEvent } from "react-testing-library";
describe("Counter", () => {
  it("renders 0 then 1 after a click", () => {
    const { getByText, queryByText } = render(<Counter />);
    expect(getByText("0")).toBeDefined();
    expect(queryByText("1")).toBeNull();
    fireEvent.click(getByText("+"));
    expect(queryByText("0")).toBeNull();
    expect(getByText("1")).toBeDefined();
  });
});

describe("InternalIndicator", () => {
  it("renders 314", () => {
    const { getByText } = render(<InternalIndicator number={314} />);
    expect(getByText("314")).toBeDefined();
  });
});

describe("complexCalculation", () => {
  it.each([[0, 0], [1, 1]])("%p => %p", (input, output) => {
    expect(complexCalculation(input)).toBe(output);
  });
});
