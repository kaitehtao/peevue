"use client";
import { useRef, useState } from "react";
import { resolveGpsAddress } from "@/lib/gps-location";
import { MapPin, LocateFixed } from "lucide-react";
import {
  amenities,
  areaFor,
  validCoordinates,
  neighborhoods,
  categoryOptions,
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
  categories = [],
}: {
  value: VenueInput;
  categories?: string[];
  onChange: (v: VenueInput) => void;
}) {
  const options = categoryOptions(categories);
  const [addingCategory,setAddingCategory] = useState(false);
  const customCategory = addingCategory || !options.includes(value.type);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [results, setResults] = useState<LocationResult[]>([]);
  const latest = useRef(value);
  latest.current = value;
  const set = (patch: Partial<VenueInput>) => onChange({ ...latest.current, ...patch });
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
          "No match found. Check the street number and city, or use your current location while at the bathroom.",
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
      if (!validCoordinates(latitude, longitude))
        throw new Error(
          "Your location could not be read. Enter the bathroom address manually.",
        );
      if (accuracy > 1000)
        throw new Error(
          "Your location is too imprecise. Enter the bathroom address instead.",
        );
      const address = await resolveGpsAddress(latitude, longitude);
      set({
        latitude: Number(latitude.toFixed(5)),
        longitude: Number(longitude.toFixed(5)),
        locationSource: "gps",
        area: areaFor(latitude, longitude),
        address,
      });
      setMessage(
        `Location captured (within about ${Math.ceil(accuracy)} m). ${address.startsWith("GPS location:") ? "No street address was available. You can save this GPS location as the address or enter a street address below." : "Check the suggested address below; you can correct it without losing your GPS pin."}`,
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
        A toilet pin is added automatically from your saved address. Shared building or plaza addresses are fine. Use GPS only while you are at the bathroom. Locations become public after approval.
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
        Street address or GPS location
        <input
          required
          minLength={8}
          maxLength={250}
          value={value.address}
          onChange={(e) => {
            set({
              address: e.target.value,
              ...(value.locationSource === "gps" ? {} : { latitude: null, longitude: null, locationSource: "manual" as const }),
            });
            setResults([]);
          }}
          placeholder="Street number, street, city, state, ZIP"
        />
      </label>
      <button
        type="button"
        className="text-button"
        disabled={busy || value.address.length < 8 || value.address.startsWith("GPS location:")}
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
          Area / region{" "}
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
            value={customCategory ? "__new_category__" : value.type}
            onChange={(e) =>
              {setAddingCategory(e.target.value === "__new_category__");set({type:e.target.value === "__new_category__" ? "" : e.target.value});}
            }
          >
            {options.map((t) => (
              <option key={t}>{t}</option>
            ))}
            <option value="__new_category__">Add new category…</option>
          </select>
        </label>
        {customCategory && <label>New category name<input required minLength={2} maxLength={60} value={value.type} placeholder="e.g. Library or Shopping mall" onChange={e=>set({type:e.target.value})}/><small className="photo-rule">An administrator checks new categories before they appear publicly.</small></label>}
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
          {value.longitude!.toFixed(5)} · Area is approximate.{" "}
          <button
            type="button"
            className="inline-link"
            onClick={() =>
              set({ latitude: null, longitude: null, locationSource: "manual", address: value.address.startsWith("GPS location:") ? "" : value.address })
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
