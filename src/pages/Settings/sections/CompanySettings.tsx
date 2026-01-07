/**
 * Company Settings Section
 * Admin-only management of global company details (name, logo, contact info)
 */

import React, { useEffect, useState } from 'react';
import { companyStore } from '@/store/companyStore';
import { CompanyProfile, companyService, UpdateCompanyRequest } from '@/services/company.service';
import './CompanySettings.css';

export const CompanySettings: React.FC = () => {
  const { company, isLoading, error, setCompany, loadCompany } = companyStore();

  const [form, setForm] = useState<UpdateCompanyRequest>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!company && !isLoading) {
      loadCompany().catch(() => {
        // error already handled in store
      });
    }
  }, [company, isLoading, loadCompany]);

  useEffect(() => {
    if (company) {
      setForm({
        displayName: company.displayName,
        legalName: company.legalName,
        website: company.website,
        supportEmail: company.supportEmail,
        supportPhone: company.supportPhone,
        address: company.address,
        timezone: company.timezone,
      });
      setLogoPreview(company.logoUrl || null);
      setLogoFile(null);
    }
  }, [company]);

  const handleInputChange = (field: keyof UpdateCompanyRequest, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSaveError('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const updated: CompanyProfile = await companyService.updateCompany(form, logoFile || undefined);
      setCompany(updated);
      setLogoFile(null);
      setSaveSuccess('Company details updated successfully');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update company details';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !company) {
    return <div className="settings-section-loading">Loading company details...</div>;
  }

  return (
    <div className="company-settings">
      <div className="settings-section-header">
        <h2>Company Details</h2>
        <p className="settings-section-description">
          Manage global company branding and contact details for all users.
        </p>
      </div>

      {(error || saveError) && (
        <div className="settings-error">{saveError || error}</div>
      )}
      {saveSuccess && <div className="settings-success">{saveSuccess}</div>}

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Basic Information</h3>
        </div>
        <div className="settings-card-content">
          <div className="form-grid">
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                className="form-input"
                value={form.displayName || ''}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Company OS"
              />
              <small className="form-help">
                This name appears in the application header and login screens.
              </small>
            </div>

            <div className="form-group">
              <label>Legal Name</label>
              <input
                type="text"
                className="form-input"
                value={form.legalName || ''}
                onChange={(e) => handleInputChange('legalName', e.target.value)}
                placeholder="Company OS Pvt. Ltd."
              />
            </div>

            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                className="form-input"
                value={form.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://companyos.com"
              />
            </div>

            <div className="form-group">
              <label>Support Email</label>
              <input
                type="email"
                className="form-input"
                value={form.supportEmail || ''}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                placeholder="support@companyos.com"
              />
            </div>

            <div className="form-group">
              <label>Support Phone</label>
              <input
                type="tel"
                className="form-input"
                value={form.supportPhone || ''}
                onChange={(e) => handleInputChange('supportPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="form-group">
              <label>Timezone</label>
              <input
                type="text"
                className="form-input"
                value={form.timezone || ''}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                placeholder="e.g., Asia/Kolkata"
              />
            </div>

            <div className="form-group full-width">
              <label>Address</label>
              <textarea
                className="form-input"
                rows={3}
                value={form.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Street address, City, State, ZIP"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <h3>Company Logo</h3>
        </div>
        <div className="settings-card-content">
          <div className="logo-settings">
            <div className="logo-preview">
              {logoPreview ? (
                <img src={logoPreview} alt="Company logo preview" />
              ) : (
                <div className="logo-placeholder">No logo set</div>
              )}
            </div>
            <div className="logo-actions">
              <label className="btn-secondary btn-sm">
                Choose Logo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p className="form-help">
                Recommended: square PNG/JPG, at least 128x128px.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving || !form.displayName}
        >
          {saving ? 'Saving...' : 'Save Company Details'}
        </button>
      </div>
    </div>
  );
};


