"use client";

import { useState, useEffect, useCallback } from "react";

type MicSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

const DEFAULT_THRESHOLD = 0.3;

export function MicSettings({ isOpen, onClose }: MicSettingsProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Request permission first (needed to get device labels)
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
      setDevices(audioInputs);

      // Load saved preference
      const saved = localStorage.getItem("preferredMicId");
      if (saved && audioInputs.some((d) => d.deviceId === saved)) {
        setSelectedDeviceId(saved);
      } else if (audioInputs.length > 0) {
        // Default to first device or "default"
        const defaultDevice = audioInputs.find((d) => d.deviceId === "default") || audioInputs[0];
        setSelectedDeviceId(defaultDevice.deviceId);
      }
    } catch (err) {
      console.error("Error loading devices:", err);
      setError("Could not access microphone. Please check permissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
      // Load threshold
      const savedThreshold = localStorage.getItem("searchThreshold");
      if (savedThreshold) {
        setThreshold(parseFloat(savedThreshold));
      }
    }
  }, [isOpen, loadDevices]);

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem("preferredMicId", deviceId);
  };

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    localStorage.setItem("searchThreshold", value.toString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(26, 15, 8, 0.6)" }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative rounded-lg shadow-xl w-full max-w-md p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold"
            style={{
              color: "var(--foreground)",
              fontFamily: "var(--font-playfair), Georgia, serif",
            }}
          >
            Settings
          </h2>
          <button
            onClick={onClose}
            className="transition-opacity hover:opacity-70"
            style={{ color: "var(--foreground-muted)" }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground-muted)" }}
            >
              Microphone Input
            </label>

            {loading ? (
              <div className="flex items-center gap-2" style={{ color: "var(--foreground-muted)" }}>
                <div
                  className="animate-spin rounded-full h-4 w-4 border-b-2"
                  style={{ borderColor: "var(--accent-gold)" }}
                />
                Loading devices...
              </div>
            ) : error ? (
              <p className="text-sm" style={{ color: "var(--accent-burgundy)" }}>{error}</p>
            ) : devices.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>No microphones found</p>
            ) : (
              <div className="space-y-2">
                {devices.map((device) => (
                  <label
                    key={device.deviceId}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    style={{
                      border: selectedDeviceId === device.deviceId
                        ? "1px solid var(--accent-gold)"
                        : "1px solid var(--card-border)",
                      background: selectedDeviceId === device.deviceId
                        ? "var(--brown-100)"
                        : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name="microphone"
                      value={device.deviceId}
                      checked={selectedDeviceId === device.deviceId}
                      onChange={() => handleSelect(device.deviceId)}
                      style={{ accentColor: "var(--accent-gold)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </p>
                      {device.deviceId === "default" && (
                        <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>System default</p>
                      )}
                    </div>
                    {selectedDeviceId === device.deviceId && (
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        style={{ color: "var(--accent-gold)" }}
                      >
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Search Threshold */}
          <div
            className="pt-4 border-t"
            style={{ borderColor: "var(--card-border)" }}
          >
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--foreground-muted)" }}
            >
              Semantic Search Threshold
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={threshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ background: "var(--brown-200)" }}
              />
              <div
                className="flex justify-between text-xs"
                style={{ color: "var(--foreground-muted)" }}
              >
                <span>Strict (0.1)</span>
                <span className="font-medium" style={{ color: "var(--foreground)" }}>{threshold.toFixed(2)}</span>
                <span>Loose (1.0)</span>
              </div>
              <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                Lower values return more relevant results. Higher values return more results but may be less accurate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to get the preferred mic ID
export function getPreferredMicId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("preferredMicId") || undefined;
}

// Helper to get the search threshold
export function getSearchThreshold(): number {
  if (typeof window === "undefined") return DEFAULT_THRESHOLD;
  const saved = localStorage.getItem("searchThreshold");
  return saved ? parseFloat(saved) : DEFAULT_THRESHOLD;
}
