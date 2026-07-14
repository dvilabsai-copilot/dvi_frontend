import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export const PackageIncludesCard: React.FC<{ packageIncludes: any }> = ({ packageIncludes }) => (
  <Card className="border-none shadow-none bg-white">
    <CardContent className="pt-2">
      <h2 className="text-lg font-semibold text-[#4a4260] mb-4">Package Includes</h2>
      <div className="space-y-3 text-sm text-[#6c6c6c]">
        <div>
          <p className="font-medium text-[#4a4260] mb-1">Package Includes: (Inclusion)</p>
          <p>{packageIncludes?.description}</p>
        </div>
        <div>
          <p className="font-medium text-[#4a4260] mb-1">If staying in the House boat At Alleppey/Kumarakom</p>
          <p className="whitespace-pre-line">{packageIncludes?.houseBoatNote}</p>
        </div>
        <div><p className="font-medium text-[#4a4260]">{packageIncludes?.rateNote}</p></div>
      </div>
    </CardContent>
  </Card>
);

