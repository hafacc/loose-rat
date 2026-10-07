import "./app.css";
import { mount } from "svelte";
import App from "./app.svelte";

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root");
}
mount(App, { target: root });
