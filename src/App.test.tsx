import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("LifeLayers app shell", () => {
  it("renders without crashing", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "LifeLayers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /search places/i })).toBeInTheDocument();
  });
});
