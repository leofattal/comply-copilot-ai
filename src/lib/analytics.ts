// Analytics tracking utilities

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
}

// Google Analytics 4 event tracking
export const trackEvent = ({ action, category, label, value }: AnalyticsEvent) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Common event trackers
export const analytics = {
  // CTA button clicks
  trackCTAClick: (ctaName: string, location: string) => {
    trackEvent({
      action: 'cta_click',
      category: 'engagement',
      label: `${ctaName}_${location}`,
    });
  },

  // Form submissions
  trackFormSubmit: (formType: string) => {
    trackEvent({
      action: 'form_submit',
      category: 'conversion',
      label: formType,
    });
  },

  // Page section views
  trackSectionView: (sectionName: string) => {
    trackEvent({
      action: 'section_view',
      category: 'engagement',
      label: sectionName,
    });
  },

  // Demo requests
  trackDemoRequest: () => {
    trackEvent({
      action: 'demo_request',
      category: 'conversion',
      label: 'watch_demo_button',
    });
  },

  // Pricing plan clicks
  trackPricingClick: (planName: string) => {
    trackEvent({
      action: 'pricing_click',
      category: 'conversion',
      label: planName.toLowerCase(),
    });
  },

  // Feature exploration
  trackFeatureClick: (featureName: string) => {
    trackEvent({
      action: 'feature_click',
      category: 'engagement',
      label: featureName.toLowerCase().replace(/\s+/g, '_'),
    });
  },
};

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer: any[];
  }
}