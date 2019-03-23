import React from "react";
import { render } from "react-dom";
import Counter from "./components/counter.jsx";

const div = document.createElement("div");
document.body.appendChild(div);

render(<Counter />, div);
