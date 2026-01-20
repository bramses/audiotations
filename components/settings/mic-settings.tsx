"use client";

import { useState, useEffect, useCallback } from "react";

type MicSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MicSettings({ isOpen, onClose }: MicSettingsProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    }
  }, [isOpen, loadDevices]);

  const handleSelect = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    localStorage.setItem("preferredMicId", deviceId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Microphone Input
            </label>

            {loading ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500" />
                Loading devices...
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : devices.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No microphones found</p>
            ) : (
              <div className="space-y-2">
                {devices.map((device) => (
                  <label
                    key={device.deviceId}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDeviceId === device.deviceId
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="microphone"
                      value={device.deviceId}
                      checked={selectedDeviceId === device.deviceId}
                      onChange={() => handleSelect(device.deviceId)}
                      className="text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </p>
                      {device.deviceId === "default" && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">System default</p>
                      )}
                    </div>
                    {selectedDeviceId === device.deviceId && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your selection is saved automatically and will be used for all recordings.
          </p>
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
