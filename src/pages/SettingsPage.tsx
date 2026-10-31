import { contrastText } from "../lib/branding-validation";
import { useUnsavedChanges } from "../lib/useUnsavedChanges";
import { Check, Palette, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  BRAND_PRESETS,
  DEFAULT_BRAND,
  saveBrandSettings,
  useBrandSettings,
} from "../lib/branding";
import { imageFileToDataUrl } from "../lib/images";
import type { BrandSettings } from "../lib/types";
import { Notice, PageHeader } from "../components/ui";

export default function SettingsPage() {
  const current = useBrandSettings();
  const [draft, setDraft] = useState<BrandSettings>(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  useEffect(() => setDraft(current), [current]);
  async function save() {
    try {
      await saveBrandSettings(draft);
      setSaved(true);
      setDirty(false);
      setError("");
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setError(String(error));
    }
  }
  async function logo(file?: File) {
    if (!file) return;
    try {
      const logoDataUrl = await imageFileToDataUrl(file);
      setDraft((value) => ({ ...value, logoDataUrl }));
      setError("");
    } catch (error) {
      setError(String(error));
    } finally {
      if (logoInput.current) logoInput.current.value = "";
    }
  }
  return (
    <div className="page settings-page" onChange={() => setDirty(true)}>
      <PageHeader
        eyebrow="System configuration"
        title="Settings"
        description="Apply a coach's identity without changing assessment data, scoring contracts, or application plumbing."
        actions={
          <button className="button primary" onClick={save}>
            <Check size={17} />
            {saved ? "Saved" : "Save branding"}
          </button>
        }
      />
      {error && <Notice tone="warning">{error}</Notice>}
      <Notice>
        <strong>Brand safe by design.</strong> Colors, typography, names, and
        logo are stored separately from athlete and scoring records. A visual
        overhaul cannot change published results.
      </Notice>
      <div className="settings-layout">
        <section className="panel brand-settings">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Coach identity</p>
              <h2>Brand system</h2>
            </div>
            <Palette />
          </div>
          <div
            className="brand-preview"
            style={{
              background: draft.inkColor,
              color: contrastText(draft.inkColor),
              borderColor: draft.primaryColor,
            }}
          >
            <span style={{ background: draft.accentColor }} />
            {draft.logoDataUrl && (
              <img src={draft.logoDataUrl} alt="Logo preview" />
            )}
            <div>
              <strong style={{ fontFamily: draft.displayFont }}>
                {draft.organizationName}
              </strong>
              <small>{draft.productName}</small>
            </div>
          </div>
          <div className="settings-form">
            <label>
              Organization name
              <input
                value={draft.organizationName}
                onChange={(event) =>
                  setDraft({ ...draft, organizationName: event.target.value })
                }
              />
            </label>
            <label>
              Product name
              <input
                value={draft.productName}
                onChange={(event) =>
                  setDraft({ ...draft, productName: event.target.value })
                }
              />
            </label>
            <label>
              Primary color
              <input
                type="color"
                value={draft.primaryColor}
                onChange={(event) =>
                  setDraft({ ...draft, primaryColor: event.target.value })
                }
              />
            </label>
            <label>
              Accent color
              <input
                type="color"
                value={draft.accentColor}
                onChange={(event) =>
                  setDraft({ ...draft, accentColor: event.target.value })
                }
              />
            </label>
            <label>
              Shell color
              <input
                type="color"
                value={draft.inkColor}
                onChange={(event) =>
                  setDraft({ ...draft, inkColor: event.target.value })
                }
              />
            </label>
            <label>
              Body font
              <select
                value={draft.bodyFont}
                onChange={(event) =>
                  setDraft({ ...draft, bodyFont: event.target.value })
                }
              >
                <option>DM Sans</option>
                <option>Arial</option>
                <option>Verdana</option>
                <option>system-ui</option>
              </select>
            </label>
            <label>
              Display font
              <select
                value={draft.displayFont}
                onChange={(event) =>
                  setDraft({ ...draft, displayFont: event.target.value })
                }
              >
                <option>Manrope</option>
                <option>Arial</option>
                <option>Arial Black</option>
                <option>Georgia</option>
              </select>
            </label>
            <label className="wide">
              Logo
              <input
                ref={logoInput}
                hidden
                type="file"
                accept="image/*"
                onChange={(event) => logo(event.target.files?.[0])}
              />
              <button
                className="button secondary"
                type="button"
                onClick={() => logoInput.current?.click()}
              >
                <Upload size={16} />
                Choose image
              </button>
            </label>
          </div>
          <div className="settings-actions">
            <button
              className="button secondary"
              onClick={() => {
                setDirty(true);
                setDraft(DEFAULT_BRAND);
              }}
            >
              <RotateCcw size={16} />
              Reset brand draft
            </button>
            {draft.logoDataUrl && (
              <button
                className="button secondary"
                onClick={() => {
                  setDirty(true);
                  setDraft({ ...draft, logoDataUrl: undefined });
                }}
              >
                Remove logo
              </button>
            )}
          </div>
        </section>
        <aside className="settings-side">
          <section className="panel">
            <p className="eyebrow">Design directions</p>
            <h2>Fast visual concepts</h2>
            <p>
              Apply a complete token set, then save. These presets affect the
              shell and reports without touching data.
            </p>
            <div className="preset-list">
              {BRAND_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setDirty(true);
                    setDraft({ ...draft, ...preset.settings });
                  }}
                >
                  <span style={{ background: preset.settings.primaryColor }} />
                  <div>
                    <strong>{preset.name}</strong>
                    <small>{preset.description}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
