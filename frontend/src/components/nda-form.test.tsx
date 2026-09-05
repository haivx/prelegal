import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { NdaForm } from "./nda-form";
import { createDefaultNdaFormData, type NdaFormData } from "@/types/nda";

/** NdaForm is a controlled component; wrap it with local state so typing
 * and clicking are reflected back into the rendered inputs, the way the
 * real page uses it. */
function ControlledNdaForm({ initial }: { initial?: Partial<NdaFormData> }) {
  const [data, setData] = useState<NdaFormData>({
    ...createDefaultNdaFormData(),
    ...initial,
  });
  return <NdaForm data={data} onChange={setData} />;
}

describe("NdaForm", () => {
  it("renders the default field values", () => {
    render(<ControlledNdaForm />);

    expect(screen.getByLabelText(/party 1 name/i)).toHaveValue("");
    expect(screen.getByLabelText(/party 2 name/i)).toHaveValue("");
    expect(
      screen.getByLabelText(/how confidential information may be used/i)
    ).toHaveValue(
      "Evaluating whether to enter into a business relationship with the other party."
    );
    expect(screen.getByLabelText(/governing law/i)).toHaveValue("");
    expect(screen.getByLabelText(/^jurisdiction$/i)).toHaveValue("");
  });

  it("marks the required fields as required and leaves modifications optional", () => {
    render(<ControlledNdaForm />);

    expect(screen.getByLabelText(/party 1 name/i)).toBeRequired();
    expect(screen.getByLabelText(/party 2 name/i)).toBeRequired();
    expect(
      screen.getByLabelText(/how confidential information may be used/i)
    ).toBeRequired();
    expect(screen.getByLabelText(/^effective date$/i)).toBeRequired();
    expect(screen.getByLabelText(/governing law/i)).toBeRequired();
    expect(screen.getByLabelText(/^jurisdiction$/i)).toBeRequired();
    expect(
      screen.getByPlaceholderText(/list any modifications/i)
    ).not.toBeRequired();
  });

  it("updates a party name as the user types", async () => {
    const user = userEvent.setup();
    render(<ControlledNdaForm />);

    const input = screen.getByLabelText(/party 1 name/i);
    await user.type(input, "Acme Inc");

    expect(input).toHaveValue("Acme Inc");
  });

  it("defaults to a 1-year MNDA term with the years input enabled", () => {
    const { container } = render(<ControlledNdaForm />);

    const [expiresRadio, perpetualRadio] = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[name="mndaTermType"]'
      )
    );
    const yearsInput = container.querySelector<HTMLInputElement>(
      'fieldset input[type="number"]'
    );

    expect(expiresRadio).toBeChecked();
    expect(perpetualRadio).not.toBeChecked();
    expect(yearsInput).toBeEnabled();
    expect(yearsInput).toHaveValue(1);
  });

  it("disables the MNDA term years input once 'perpetual' is selected", async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlledNdaForm />);

    const [, perpetualRadio] = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[name="mndaTermType"]'
      )
    );
    await user.click(perpetualRadio);

    const [, refetchedPerpetualRadio] = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[name="mndaTermType"]'
      )
    );
    const yearsInput = container.querySelector<HTMLInputElement>(
      'fieldset input[type="number"]'
    );

    expect(refetchedPerpetualRadio).toBeChecked();
    expect(yearsInput).toBeDisabled();
  });

  it("disables the confidentiality term years input once 'in perpetuity' is selected", async () => {
    const user = userEvent.setup();
    const { container } = render(<ControlledNdaForm />);

    const confidentialityRadios = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[name="confidentialityTermType"]'
      )
    );
    const perpetuityRadio = confidentialityRadios[1];
    await user.click(perpetuityRadio);

    const numberInputs = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="number"]')
    );
    const confidentialityYearsInput = numberInputs[1];

    expect(perpetuityRadio).toBeChecked();
    expect(confidentialityYearsInput).toBeDisabled();
  });
});
