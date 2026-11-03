import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HotelStayPanePresentation } from "./HotelStayPanePresentation";

afterEach(() => {
  cleanup();
  document.querySelector('[data-testid="popup-pane-host"]')?.remove();
});

describe("HotelStayPanePresentation", () => {
  it("moves the existing expanded row into the popup table body", () => {
    const hostTable = document.createElement("table");
    const host = document.createElement("tbody");
    hostTable.dataset.testid = "popup-pane-host";
    hostTable.append(host);
    document.body.append(hostTable);

    const { container } = render(
      <table>
        <tbody>
          <HotelStayPanePresentation inDialog dialogTableBody={host}>
            <tr><td>Existing hotel search and cards</td></tr>
          </HotelStayPanePresentation>
        </tbody>
      </table>,
    );

    expect(screen.getByText("Existing hotel search and cards")).toBeInTheDocument();
    expect(host.querySelector("tr")).not.toBeNull();
    expect(container.querySelector("tr")).toBeNull();
  });

  it("keeps ordinary Hotel List expansion inline", () => {
    const host = document.createElement("tbody");

    const { container } = render(
      <table>
        <tbody>
          <HotelStayPanePresentation inDialog={false} dialogTableBody={host}>
            <tr><td>Inline hotel search and cards</td></tr>
          </HotelStayPanePresentation>
        </tbody>
      </table>,
    );

    expect(screen.getByText("Inline hotel search and cards")).toBeInTheDocument();
    expect(container.querySelector("tbody tr")).not.toBeNull();
    expect(host.querySelector("tr")).toBeNull();
  });

  it("does not flash an inline row before the popup host mounts", () => {
    const { container } = render(
      <table>
        <tbody>
          <HotelStayPanePresentation inDialog dialogTableBody={null}>
            <tr><td>Popup hotel search and cards</td></tr>
          </HotelStayPanePresentation>
        </tbody>
      </table>,
    );

    expect(container.querySelector("tr")).toBeNull();
    expect(screen.queryByText("Popup hotel search and cards")).toBeNull();
  });
});
