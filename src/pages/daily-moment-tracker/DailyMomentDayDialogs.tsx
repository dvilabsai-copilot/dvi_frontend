import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const NotVisitedModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (
    reason: string,
    voiceFile?: File,
  ) => Promise<void>;
  title?: string;
  voiceEnabled?: boolean;
}> = ({
  open,
  onClose,
  onSubmit,
  title,
  voiceEnabled = false,
}) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const voiceUrlRef = useRef("");

  const stopTracks = () => {
    streamRef.current
      ?.getTracks()
      .forEach((track) => track.stop());

    streamRef.current = null;
  };

  const revokeUrl = () => {
    if (voiceUrlRef.current) {
      URL.revokeObjectURL(
        voiceUrlRef.current,
      );

      voiceUrlRef.current = "";
    }

    setVoiceUrl("");
  };

  const removeVoice = () => {
    const recorder = recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.ondataavailable = null;
      recorder.onstop = null;

      try {
        recorder.stop();
      } catch {
        // cleanup only
      }
    }

    recorderRef.current = null;
    chunksRef.current = [];
    stopTracks();
    revokeUrl();

    setVoiceFile(null);
    setRecording(false);
  };

  useEffect(() => {
    if (open) {
      setReason("");
      setErr(null);
      removeVoice();
    }
  }, [open]);

  useEffect(
    () => () => {
      const recorder =
        recorderRef.current;

      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        recorder.ondataavailable = null;
        recorder.onstop = null;

        try {
          recorder.stop();
        } catch {
          // cleanup only
        }
      }

      streamRef.current
        ?.getTracks()
        .forEach(
          (track) => track.stop(),
        );

      if (voiceUrlRef.current) {
        URL.revokeObjectURL(
          voiceUrlRef.current,
        );
      }
    },
    [],
  );

  const startRecording = async () => {
    setErr(null);

    if (
      typeof window === "undefined" ||
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setErr(
        "Voice recording requires HTTPS (or localhost) and microphone permission.",
      );

      return;
    }

    try {
      removeVoice();

      const stream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          });

      streamRef.current = stream;

      const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ];

      const mimeType =
        candidates.find(
          (type) =>
            MediaRecorder
              .isTypeSupported?.(
                type,
              ),
        ) || "";

      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              { mimeType },
            )
          : new MediaRecorder(
              stream,
            );

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable =
        (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(
              event.data,
            );
          }
        };

      recorder.onstop = () => {
        setRecording(false);
        stopTracks();

        const type =
          recorder.mimeType ||
          chunksRef.current[0]?.type ||
          "audio/webm";

        const blob =
          new Blob(
            chunksRef.current,
            { type },
          );

        chunksRef.current = [];
        recorderRef.current = null;

        if (!blob.size) {
          setErr(
            "No audio was recorded. Please try again.",
          );

          return;
        }

        let ext = "webm";

        if (type.includes("mp4")) {
          ext = "m4a";
        } else if (
          type.includes("ogg")
        ) {
          ext = "ogg";
        }

        const file =
          new File(
            [blob],
            `not-completed-${Date.now()}.${ext}`,
            { type },
          );

        revokeUrl();

        const url =
          URL.createObjectURL(
            file,
          );

        voiceUrlRef.current = url;

        setVoiceUrl(url);
        setVoiceFile(file);
      };

      recorder.onerror = () => {
        setRecording(false);
        stopTracks();

        setErr(
          "Voice recording failed. Please allow microphone access and retry.",
        );
      };

      recorder.start();

      setRecording(true);
    } catch (error) {
      stopTracks();
      setRecording(false);

      setErr(
        error instanceof Error
          ? error.message
          : "Unable to access microphone.",
      );
    }
  };

  const stopRecording = () => {
    const recorder =
      recorderRef.current;

    if (
      recorder &&
      recorder.state !== "inactive"
    ) {
      recorder.stop();
    }
  };

  const submit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (recording) {
      setErr(
        "Stop recording before saving.",
      );

      return;
    }

    const text =
      reason.trim();

    if (
      !text &&
      !voiceFile
    ) {
      setErr(
        voiceEnabled
          ? "Enter a reason or record a voice message."
          : "Reason is required.",
      );

      return;
    }

    try {
      setSaving(true);
      setErr(null);

      await onSubmit(
        text,
        voiceFile || undefined,
      );

      onClose();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          removeVoice();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {title ??
              "Not Visited – Reason"}
          </DialogTitle>

          <DialogDescription className="sr-only">
            Provide a reason for marking this stop as not visited.
          </DialogDescription>
        </DialogHeader>

        {err && (
          <div className="rounded border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
            {err}
          </div>
        )}

        <form
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="space-y-1">
            <Label className="text-xs text-[#4a4260]">
              Reason
              {voiceEnabled
                ? " (or record voice)"
                : ""}
            </Label>

            <Textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value,
                )
              }
              rows={3}
              className="text-sm"
              placeholder="Enter reason…"
            />
          </div>

          {voiceEnabled && (
            <div className="space-y-3 rounded-lg border border-[#e3d4ff] bg-[#faf7ff] p-3">
              <div>
                <Label className="text-xs font-semibold text-[#4a4260]">
                  Voice Message
                </Label>

                <p className="mt-1 text-[11px] text-[#7b6f9a]">
                  You can use text, voice, or both.
                </p>
              </div>

              {recording ? (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
                    Recording…
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="w-full"
                    onClick={stopRecording}
                  >
                    Stop Recording
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  className="w-full border-[#7040c7] text-[#7040c7]"
                  onClick={() =>
                    void startRecording()
                  }
                >
                  {voiceFile
                    ? "Record Again"
                    : "Record Voice Message"}
                </Button>
              )}

              {voiceUrl &&
                voiceFile &&
                !recording && (
                  <>
                    <audio
                      controls
                      src={voiceUrl}
                      preload="metadata"
                      className="w-full"
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      className="w-full text-red-600"
                      onClick={removeVoice}
                    >
                      Remove Voice Message
                    </Button>
                  </>
                )}

              <p className="text-[10px] text-[#8b8194]">
                Microphone recording requires HTTPS or localhost.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => {
                removeVoice();
                onClose();
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={
                saving ||
                recording
              }
              className="bg-gradient-to-r from-[#f763c6] to-[#a347ff] text-white"
            >
              {saving
                ? "Saving…"
                : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const KmModal: React.FC<{
  open: boolean;
  onClose: () => void;
  openingKm: string;
  onSaveOpening: (value: string) => Promise<void>;
  onSaveClosing: (value: string) => Promise<void>;
}> = ({ open, onClose, openingKm, onSaveOpening, onSaveClosing }) => {
  const [startKm, setStartKm] = useState("");
  const [closeKm, setCloseKm] = useState("");
  const [savingOpen, setSavingOpen] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setStartKm(""); setCloseKm(""); setErr(null); } }, [open]);
  const handleOpen = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startKm.trim() || Number(startKm) <= 0) { setErr("Enter a valid starting KM."); return; }
    try { setSavingOpen(true); setErr(null); await onSaveOpening(startKm); onClose(); }
    catch (error) { setErr(error instanceof Error ? error.message : "Failed."); }
    finally { setSavingOpen(false); }
  };
  const handleClose = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!closeKm.trim()) { setErr("Enter closing KM."); return; }
    try { setSavingClose(true); setErr(null); await onSaveClosing(closeKm); onClose(); }
    catch (error) { setErr(error instanceof Error ? error.message : "Failed."); }
    finally { setSavingClose(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="text-base font-semibold">Kilometer Entry</DialogTitle><DialogDescription className="sr-only">Save opening or closing kilometer values for this route.</DialogDescription></DialogHeader>
        {err && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <form onSubmit={handleOpen} className="space-y-2 border border-[#e3d4ff] rounded-lg p-3"><p className="text-xs font-semibold text-[#4a4260]">Opening KM</p><Input type="number" min="1" step="1" value={startKm} onChange={(event) => setStartKm(event.target.value)} placeholder="e.g. 10500" className="h-9 text-sm" /><Button type="submit" size="sm" disabled={savingOpen} className="w-full h-9 bg-[#16a34a] text-white">{savingOpen ? "Saving…" : "Save Opening KM"}</Button></form>
          <form onSubmit={handleClose} className="space-y-2 border border-[#e3d4ff] rounded-lg p-3"><p className="text-xs font-semibold text-[#4a4260]">Closing KM <span className="text-[10px] text-[#7b6f9a]">(must &gt; {openingKm || "0"})</span></p><Input type="number" min="1" step="1" value={closeKm} onChange={(event) => setCloseKm(event.target.value)} placeholder="e.g. 10750" className="h-9 text-sm" /><Button type="submit" size="sm" disabled={savingClose} className="w-full h-9 bg-[#7c3aed] text-white">{savingClose ? "Saving…" : "Save Closing KM"}</Button></form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
