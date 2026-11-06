import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { track } from './analytics.js';
import { PAY_PER_EVENT_TIERS, PRO_PRICES, formatEur } from './pricing.js';
import { SIGNUP_URL } from './signup.js';

const FEATURE_IDS = {
  starter: ['event', 'participants', 'suppliers', 'documents'],
  event: ['event', 'suppliers', 'report', 'integrations'],
  pro: ['events', 'participants', 'reports', 'team'],
};

export default function Pricing() {
  const { i18n, t } = useTranslation();
  const [selectedTierKey, setSelectedTierKey] = useState(PAY_PER_EVENT_TIERS[0].key);
  const selectedTier = PAY_PER_EVENT_TIERS.find(({ key }) => key === selectedTierKey)
    ?? PAY_PER_EVENT_TIERS[0];
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'pt-PT';

  const renderFeatures = (planId) => (
    <ul className="pricing-card__features">
      {FEATURE_IDS[planId].map((featureId) => (
        <li key={featureId}>
          <span aria-hidden="true">✓</span>
          {t(`pricing.plans.${planId}.features.${featureId}`)}
        </li>
      ))}
    </ul>
  );

  return (
    <section id="pricing" className="pricing" aria-labelledby="pricing-title">
      <div className="pricing__intro">
        <p className="section-eyebrow">{t('pricing.eyebrow')}</p>
        <h2 id="pricing-title" className="section-title">{t('pricing.title')}</h2>
        <p className="body-copy">{t('pricing.body')}</p>
      </div>

      <div className="pricing-grid">
        <article className="pricing-card">
          <div className="pricing-card__heading">
            <h3 className="pricing-card__name">{t('pricing.plans.starter.name')}</h3>
            <p>{t('pricing.plans.starter.description')}</p>
          </div>
          <div className="pricing-card__price pricing-card__price--free">
            <strong>{t('pricing.free')}</strong>
            <span>{t('pricing.noSubscription')}</span>
          </div>
          {renderFeatures('starter')}
          <a
            className="pricing-card__cta"
            href={SIGNUP_URL}
            onClick={() => track('cta_click', { placement: 'pricing-starter' })}
          >
            {t('pricing.plans.starter.cta')}
            <span aria-hidden="true">→</span>
          </a>
        </article>

        <article className="pricing-card">
          <div className="pricing-card__heading">
            <h3 className="pricing-card__name">{t('pricing.plans.event.name')}</h3>
            <p>{t('pricing.plans.event.description')}</p>
          </div>
          <div className="pricing-card__price">
            <strong>{formatEur(selectedTier.amount, locale)}</strong>
            <span>{t('pricing.oneTime')}</span>
          </div>
          <fieldset className="pricing-tiers">
            <legend>{t('pricing.participantCapacity')}</legend>
            <div className="pricing-tiers__options">
              {PAY_PER_EVENT_TIERS.map(({ key }) => (
                <button
                  key={key}
                  type="button"
                  className={key === selectedTierKey ? 'pricing-tier pricing-tier--selected' : 'pricing-tier'}
                  aria-pressed={key === selectedTierKey}
                  onClick={() => setSelectedTierKey(key)}
                >
                  {t(`pricing.tiers.${key}`)}
                </button>
              ))}
            </div>
          </fieldset>
          {renderFeatures('event')}
          <a
            className="pricing-card__cta"
            href={SIGNUP_URL}
            onClick={() => track('cta_click', { placement: 'pricing-event' })}
          >
            {t('pricing.plans.event.cta')}
            <span aria-hidden="true">→</span>
          </a>
        </article>

        <article className="pricing-card pricing-card--pro">
          <span className="pricing-card__badge">{t('pricing.proBadge')}</span>
          <div className="pricing-card__heading">
            <h3 className="pricing-card__name">{t('pricing.plans.pro.name')}</h3>
            <p>{t('pricing.plans.pro.description')}</p>
          </div>
          <div className="pricing-card__discount">
            <span>{t('pricing.currentPrice')}</span>
            <del>{formatEur(PRO_PRICES.listMonthly, locale)}</del>
          </div>
          <div className="pricing-card__price">
            <strong>{formatEur(PRO_PRICES.currentMonthly, locale)}</strong>
            <span>{t('pricing.perMonth')}</span>
          </div>
          <p className="pricing-card__annual">
            {t('pricing.annualAlternative', {
              price: formatEur(PRO_PRICES.currentAnnual, locale),
            })}
          </p>
          {renderFeatures('pro')}
          <a
            className="pricing-card__cta pricing-card__cta--pro"
            href={SIGNUP_URL}
            onClick={() => track('cta_click', { placement: 'pricing-pro' })}
          >
            {t('pricing.plans.pro.cta')}
            <span aria-hidden="true">→</span>
          </a>
        </article>
      </div>

      <p className="pricing__footnote">{t('pricing.footnote')}</p>
    </section>
  );
}
