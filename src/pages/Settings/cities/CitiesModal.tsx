// FILE: src/pages/Settings/CitiesModal.tsx

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { State } from "@/services/citiesService";

export type CityFormValues = {
  city_name: string;
 state_id: string; // keep string for Select; convert to Number on submit
};

export function CitiesModal(props: {
  open: boolean;
  mode: "create" | "edit";
  states: State[];
  initial?: CityFormValues;
  onClose: () => void;
  onSubmit: (v: CityFormValues) => void | Promise<void>;
}) {
  const { open, mode, states, initial, onClose, onSubmit } = props;

  const [values, setValues] = useState<CityFormValues>({
    city_name: "",
    state_id: "",
  });

  useEffect(() => {
    if (!open) return;
    setValues(
      initial ?? {
        city_name: "",
        state_id: "",
      }
    );
  }, [open, initial]);

  const title = mode === "create" ? "Add City" : "Update City";

  const save = async () => {
    if (!values.state_id || !values.city_name.trim()) return;
    await onSubmit({ ...values, city_name: values.city_name.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {mode === "create" ? "Create a new city entry" : "Update city information"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
 {/* Country */}
          <div className="space-y-2">
            <Label>
              County Name <span className="text-red-500">*</span>
            </Label>
            <Select value="India" onValueChange={() => {}}>
              <SelectTrigger className="bg-slate-50" disabled>
                <SelectValue placeholder="India" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="India">India</SelectItem>
              </SelectContent>
            </Select>
          </div>

 {/* State */}
          <div className="space-y-2">
            <Label>
              State Name <span className="text-red-500">*</span>
            </Label>
            <Select
              value={values.state_id}
              onValueChange={(v) => setValues((p) => ({ ...p, state_id: v }))}
            >
              <SelectTrigger className={!values.state_id ? "border-red-400" : ""}>
                <SelectValue placeholder="Choose State" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.state_id} value={String(s.state_id)}>
                    {s.state_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

 {/* City */}
          <div className="space-y-2">
            <Label>
              City Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={values.city_name}
              onChange={(e) => setValues((p) => ({ ...p, city_name: e.target.value }))}
              placeholder="Enter the City Name"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button type="button" variant="secondary" onClick={onClose} className="px-10">
            Cancel
          </Button>

          <Button
            type="button"
            onClick={save}
            disabled={!values.city_name.trim() || !values.state_id}
            className="px-10 bg-gradient-to-r from-[#9b5cff] to-[#ff68b4]"
          >
            {mode === "create" ? "Save" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
