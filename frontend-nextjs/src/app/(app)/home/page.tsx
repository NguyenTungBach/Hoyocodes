'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Gamepad2,
  Globe,
  Layers,
  Loader2,
  Moon,
  Sun,
  Train,
  Wind,
} from 'lucide-react';
import {
  redeemCodesApi,
  REDEEM_URLS,
  type RedeemCode,
  type RedeemCodePagination,
  type RedeemCodeStatus,
  type RedeemCodeType,
} from '@/lib/api/redeemCodes';
import { getApiErrorMessage } from '@/lib/api/client';
import { SUPPORTED_LOCALES, type AppLocale } from '@/lib/i18n';
import { useTranslation } from '@/hooks/useTranslation';
import { useAppStore } from '@/store/app';
import { MakeToast } from '@/lib/utils/toast';
import { cn } from '@/lib/utils';
import styles from './home.module.scss';

type TypeFilter = 'all' | RedeemCodeType;
type StatusFilter = '' | RedeemCodeStatus;
type PerPageOption = 10 | 20 | 30;

const PER_PAGE_OPTIONS: PerPageOption[] = [10, 20, 30];

const LOCALE_LABELS: Record<AppLocale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
};

const TYPE_TABS: {
  id: TypeFilter;
  labelKey: string;
  icon: ReactNode;
}[] = [
  { id: 'all', labelKey: 'HOME.FILTER_ALL', icon: <Layers size={15} aria-hidden /> },
  { id: 'genshin', labelKey: 'HOME.FILTER_GENSHIN', icon: <Wind size={15} aria-hidden /> },
  { id: 'honkai', labelKey: 'HOME.FILTER_HONKAI', icon: <Train size={15} aria-hidden /> },
  { id: 'zenless', labelKey: 'HOME.FILTER_ZENLESS', icon: <Gamepad2 size={15} aria-hidden /> },
];

const TYPE_TITLE_KEY: Record<TypeFilter, string> = {
  all: 'HOME.TITLE_ALL',
  genshin: 'HOME.FILTER_GENSHIN',
  honkai: 'HOME.FILTER_HONKAI',
  zenless: 'HOME.FILTER_ZENLESS',
};

const TYPE_BADGE_KEY: Record<RedeemCodeType, string> = {
  genshin: 'HOME.FILTER_GENSHIN',
  honkai: 'HOME.FILTER_HONKAI',
  zenless: 'HOME.FILTER_ZENLESS',
};

function formatFetchedAt(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export default function HomePage() {
  const { t, language } = useTranslation();
  const setLanguage = useAppStore((state) => state.setLanguage);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPageOption>(10);
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [pagination, setPagination] = useState<RedeemCodePagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await redeemCodesApi.list({
        page,
        per_page: perPage,
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setCodes(res.data?.result ?? []);
      setPagination(res.data?.pagination ?? null);
      setFetchedAt(formatFetchedAt(new Date()));
    } catch (err) {
      setCodes([]);
      setPagination(null);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page, perPage]);

  useEffect(() => {
    void fetchCodes();
  }, [fetchCodes]);

  const sectionTitle = useMemo(() => t(TYPE_TITLE_KEY[typeFilter]), [t, typeFilter]);

  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const currentPage = pagination?.current_page ?? page;
  const totalRecords = pagination?.total_records ?? 0;

  const handleTypeChange = (next: TypeFilter) => {
    setTypeFilter(next);
    setPage(1);
  };

  const handleStatusChange = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
  };

  const handlePerPageChange = (next: PerPageOption) => {
    setPerPage(next);
    setPage(1);
  };

  const handleCopy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      MakeToast({ variant: 'success', content: t('HOME.COPIED', { code }) });
    } catch {
      MakeToast({ variant: 'danger', content: t('HOME.COPY_FAILED') });
    }
  };

  return (
    <main className={styles.page} data-theme={theme}>
      <div className={styles.inner}>
        <header className={styles.topBar}>
          <h1 className={styles.brand}>Hoyocodes !</h1>
          <div className={styles.topActions}>
            <div className={styles.themePicker}>
              <button
                type="button"
                className={styles.themeToggle}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label={t('HOME.THEME')}
                title={theme === 'dark' ? t('HOME.THEME_LIGHT') : t('HOME.THEME_DARK')}
              >
                {theme === 'dark' ? (
                  <Sun size={16} aria-hidden />
                ) : (
                  <Moon size={16} aria-hidden />
                )}
              </button>
            </div>
            <div className={styles.langPicker}>
              <Globe size={16} aria-hidden className={styles.langIcon} />
              <label className="sr-only" htmlFor="language-select">
                {t('HOME.LANGUAGE')}
              </label>
              <select
                id="language-select"
                className={styles.langSelect}
                value={language}
                onChange={(e) => setLanguage(e.target.value as AppLocale)}
                aria-label={t('HOME.LANGUAGE')}
              >
                {SUPPORTED_LOCALES.map((locale) => (
                  <option key={locale} value={locale}>
                    {LOCALE_LABELS[locale]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* <section className={styles.about}>
          <span className={styles.aboutEmoji} aria-hidden>
            ✨
          </span>
          <h2 className={styles.aboutTitle}>{t('HOME.ABOUT_TITLE')}</h2>
          <p className={styles.aboutText}>{t('HOME.ABOUT_LINE_1')}</p>
          <p className={styles.aboutText}>
            {t('HOME.ABOUT_LINE_2_PREFIX')}{' '}
            <a
              className={styles.aboutLink}
              href="https://github.com/heartlog/Hoyocodes"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>{' '}
            {t('HOME.ABOUT_LINE_2_MID')}{' '}
            <a
              className={styles.aboutLink}
              href="https://m.hoyolab.com/#/accountCenter/postList?id=449295506"
              target="_blank"
              rel="noreferrer"
            >
              HoYoLAB
            </a>
            .
          </p>
        </section> */}

        {fetchedAt && (
          <div className={styles.lastFetched}>
            {t('HOME.LAST_FETCHED', { time: fetchedAt })}
          </div>
        )}

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.filters}>
          <div className={styles.tabs} role="tablist" aria-label={t('HOME.FILTER_TYPE')}>
            {TYPE_TABS.map((tab) => {
              const active = typeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={cn(styles.tab, active && styles.tabActive)}
                  onClick={() => handleTypeChange(tab.id)}
                >
                  {tab.icon}
                  <span>{t(tab.labelKey)}</span>
                </button>
              );
            })}
          </div>

          <label className="sr-only" htmlFor="status-filter">
            {t('HOME.FILTER_STATUS')}
          </label>
          <select
            id="status-filter"
            className={styles.statusSelect}
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          >
            <option value="">{t('HOME.STATUS_ALL')}</option>
            <option value="active">{t('HOME.STATUS_ACTIVE')}</option>
            <option value="inactive">{t('HOME.STATUS_INACTIVE')}</option>
          </select>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{sectionTitle}</h2>

          {loading ? (
            <div className={styles.stateBox}>
              <Loader2 className="mx-auto mb-2 animate-spin" size={22} aria-hidden />
              {t('HOME.LOADING')}
            </div>
          ) : codes.length === 0 ? (
            <div className={styles.stateBox}>{t('HOME.EMPTY')}</div>
          ) : (
            <>
              <div className={styles.list}>
                {codes.map((item) => {
                  const redeemUrl = `${REDEEM_URLS[item.type]}${encodeURIComponent(item.code)}`;
                  const isActive = item.status === 'active';

                  return (
                    <article
                      key={item.id}
                      className={cn(styles.card, !isActive && styles.cardInactive)}
                    >
                      <div className={styles.cardTop}>
                        <div className={styles.code}>
                          <span className={styles.codeStar} aria-hidden>
                            ✦
                          </span>
                          <span>{item.code}</span>
                        </div>

                        {typeFilter === 'all' && (
                          <span className={styles.typeBadge}>{t(TYPE_BADGE_KEY[item.type])}</span>
                        )}

                        <div className={styles.actions}>
                          <a
                            className={styles.iconBtn}
                            href={redeemUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={t('HOME.OPEN_REDEEM')}
                            title={t('HOME.OPEN_REDEEM')}
                          >
                            <ExternalLink size={16} aria-hidden />
                          </a>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => void handleCopy(item.code)}
                            aria-label={t('HOME.COPY')}
                            title={t('HOME.COPY')}
                          >
                            <Copy size={16} aria-hidden />
                          </button>
                        </div>
                      </div>

                      {item.rewards?.length > 0 && (
                        <p className={styles.rewards}>
                          <span className={styles.rewardsStar} aria-hidden>
                            ✦
                          </span>
                          <span>{item.rewards.join(' • ')}</span>
                        </p>
                      )}

                      <hr className={styles.divider} />

                      <div className={styles.status}>
                        <span
                          className={cn(styles.statusDot, !isActive && styles.statusDotInactive)}
                          aria-hidden
                        />
                        <span>
                          {isActive
                            ? t('HOME.STATUS_ACTIVE_LABEL')
                            : t('HOME.STATUS_INACTIVE_LABEL')}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className={styles.pagination}>
                <div className={styles.paginationInfo}>
                  {t('HOME.PAGINATION_INFO', {
                    page: currentPage,
                    totalPages,
                    total: totalRecords,
                  })}
                </div>

                <div className={styles.paginationControls}>
                  <label className={styles.perPageLabel} htmlFor="per-page">
                    {t('HOME.PER_PAGE')}
                  </label>
                  <select
                    id="per-page"
                    className={styles.perPageSelect}
                    value={perPage}
                    onChange={(e) => handlePerPageChange(Number(e.target.value) as PerPageOption)}
                  >
                    {PER_PAGE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={currentPage <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={t('HOME.PREV_PAGE')}
                  >
                    <ChevronLeft size={16} aria-hidden />
                  </button>
                  <span className={styles.pageIndicator}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    disabled={currentPage >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label={t('HOME.NEXT_PAGE')}
                  >
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
