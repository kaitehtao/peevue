"use client";
import { useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import {
  amenities,
  areaFor,
  inVegas,
  neighborhoods,
  placeTypes,
  type VenueInput,
} from "@/lib/community";
export const blankVenue: VenueInput = {
  name: "",
  address: "",
  yelpUrl: "",
  area: "Las Vegas area",
  type: "Restaurant",
  access: "Ask staff",
  tags: [],
  latitude: null,
  longitude: null,
  locationSource: "manual",
};
type LocationResult = {
  address: string;
  latitude: number;
  longitude: number;
  area: VenueInput["area"];
};
export function VenueFields({
  value,
  onChange,
}: {
  value: VenueInput;
  onChange: (v: VenueInput) => void;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [results, setResults] = useState<LocationResult[]>([]);
  const set = (patch: Partial<VenueInput>) => onChange({ ...value, ...patch });
  async function lookup() {
    setBusy(true);
    setMessage("");
    setResults([]);
    try {
      const response = await fetch(
        "/api/location?address=" + encodeURIComponent(value.address),
      );
      const data = (await response.json()) as {
        error?: string;
        results: LocationResult[];
      };
      if (!response.ok) throw new Error(data.error);
      setResults(data.results);
      if (!data.results.length)
        setMessage(
          "No match found. Keep the address you entered and choose a neighborhood; an administrator will verify it.",
        );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function gps() {
    if (!navigator.geolocation) {
      setMessage(
        "This browser does not support GPS. Enter the address instead.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    setResults([]);
    try {
      const p = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }),
      );
      const { latitude, longitude, accuracy } = p.coords;
      if (!inVegas(latitude, longitude))
        throw new Error(
          "PEEVUE is starting in the Las Vegas area. Enter the bathroom address manually.",
        );
      if (accuracy > 1000)
        throw new Error(
          "Your location is too imprecise. Enter the bathroom address instead.",
        );
      let address = value.address;
      try {
        const response = await fetch(
          `/api/location?lat=${latitude}&lng=${longitude}`,
        );
        const data = (await response.json()) as {
          error?: string;
          results: LocationResult[];
        };
        if (response.ok && data.results[0]) address = data.results[0].address;
      } catch {
        /* GPS remains useful when reverse lookup is unavailable. */
      }
      set({
        latitude: Number(latitude.toFixed(5)),
        longitude: Number(longitude.toFixed(5)),
        locationSource: "gps",
        area: areaFor(latitude, longitude),
        address,
      });
      setMessage(
        `Location found (within about ${Math.ceil(accuracy)} m). Check the address and neighborhood below. Nearby addresses may not identify this bathroom.`,
      );
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "Location access was unavailable. Enter the address instead.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="venue-fields">
      <legend>Property location</legend>
      <label>
        Hotel, restaurant, or building name
        <input
          required
          minLength={2}
          maxLength={120}
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="e.g. restaurant or hotel name"
        />
      </label>
      <p className="photo-rule">
        Use GPS only while you are at the bathroom. This venue location will be
        public after approval.
      </p>
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => void gps()}
      >
        <LocateFixed size={17} />
        {busy ? "Finding location…" : "Use my current location"}
      </button>
      <label>
        Street address
        <input
          required
          minLength={8}
          maxLength={250}
          value={value.address}
          onChange={(e) => {
            set({
              address: e.target.value,
              latitude: null,
              longitude: null,
              locationSource: "manual",
            });
            setResults([]);
          }}
          placeholder="Street number, street, city, NV, ZIP"
        />
      </label>
      <button
        type="button"
        className="text-button"
        disabled={busy || value.address.length < 8}
        onClick={() => void lookup()}
      >
        Find this address <MapPin size={16} />
      </button>
      {message && (
        <p role="status" className="location-message">
          {message}
        </p>
      )}
      {results.length > 0 && (
        <div className="location-results">
          <p>Select the correct address:</p>
          {results.map((r) => (
            <button
              type="button"
              key={r.latitude + "," + r.longitude}
              onClick={() => {
                set({ ...r, locationSource: "address" });
                setResults([]);
                setMessage(
                  "Address selected. Confirm it belongs to this bathroom.",
                );
              }}
            >
              {r.address}
            </button>
          ))}
        </div>
      )}
      <div className="form-two">
        <label>
          Neighborhood{" "}
          <select
            value={value.area}
            onChange={(e) =>
              set({ area: e.target.value as VenueInput["area"] })
            }
          >
            {neighborhoods.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <label>
          Type of place
          <select
            value={value.type}
            onChange={(e) =>
              set({ type: e.target.value as VenueInput["type"] })
            }
          >
            {placeTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        General property access
        <select
          value={value.access}
          onChange={(e) =>
            set({ access: e.target.value as VenueInput["access"] })
          }
        >
          {["Ask staff", "Customers only", "Public access"].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <div className="checkbox-row">
        {amenities.map((tag) => (
          <label key={tag}>
            <input
              type="checkbox"
              checked={value.tags.includes(tag)}
              onChange={(e) =>
                set({
                  tags: e.target.checked
                    ? [...value.tags, tag]
                    : value.tags.filter((t) => t !== tag),
                })
              }
            />
            {tag}
          </label>
        ))}
      </div>
      {value.latitude !== null && (
        <p className="photo-rule">
          Location pin: {value.latitude.toFixed(5)},{" "}
          {value.longitude!.toFixed(5)} · Neighborhood is approximate.{" "}
          <button
            type="button"
            className="inline-link"
            onClick={() =>
              set({ latitude: null, longitude: null, locationSource: "manual" })
            }
          >
            Remove pin
          </button>
        </p>
      )}
      <small className="attribution">
        Address lookup ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors
        </a>
      </small>
    </fieldset>
  );
}
