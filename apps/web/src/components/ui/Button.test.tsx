import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Create Your Profile</Button>);
    expect(screen.getByRole("button", { name: "Create Your Profile" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Send Interest</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Send Interest" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and non-interactive while loading", () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Submitting
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Submitting" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("respects the disabled prop", () => {
    render(<Button disabled>Unavailable</Button>);
    expect(screen.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  });
});
