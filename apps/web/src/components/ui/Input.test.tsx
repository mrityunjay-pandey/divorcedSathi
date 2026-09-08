import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("associates the label with the input", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("marks the field invalid and links the error message", () => {
    render(<Input label="Mobile number" error="This field is required." />);
    const input = screen.getByLabelText("Mobile number");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("This field is required.");
  });

  it("shows a hint when there is no error", () => {
    render(<Input label="Email" hint="We'll send a code here." />);
    expect(screen.getByText("We'll send a code here.")).toBeInTheDocument();
  });
});
