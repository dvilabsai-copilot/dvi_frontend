import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

/** Keeps unrelated Create Itinerary controls working if the hotel preview fails. */
export class TravelExpertHotelSearchBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error): void {
    console.error("[TravelExpertHotelSearch] Render error:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Hotel search controls could not be displayed. The normal DVI itinerary fields and Room Configuration below remain available.
          Check your browser Console for the hotel search error.
        </div>
      );
    }
    return this.props.children;
  }
}
