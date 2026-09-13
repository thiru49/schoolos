"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { FeeCollectionView } from "../../../../features/reports/fee-collection-view";

export default function FeeCollectionPage() {
  return (
    <div>
      <AppHeader
        title="Fee Collection Report"
        subtitle="Track expected fees, total collections, head breakdown, and outstanding dues"
      />
      <FeeCollectionView />
    </div>
  );
}
