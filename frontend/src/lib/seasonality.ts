export type YahooChartQuote = {
	date: Date | string;
	close: number | null;
};

export type SeasonalitySeriesKey = "thirtyYear" | "fifteenYear" | "fiveYear";

export type SeasonalityDataPoint = {
	dayOfYear: number;
	dateLabel: string;
	thirtyYear: number | null;
	fifteenYear: number | null;
	fiveYear: number | null;
	currentYear: number | null;
};

export type SeasonalitySeriesMeta = {
	label: string;
	requestedYears: number;
	actualYears: number;
	years: number[];
	available: boolean;
	unavailableReason?: string;
};

export type SeasonalityResult = {
	data: SeasonalityDataPoint[];
	meta: {
		currentYear: number | null;
		latestDate: string | null;
		validQuoteCount: number;
		series: Record<SeasonalitySeriesKey, SeasonalitySeriesMeta>;
	};
};

type CalendarDay = {
	dayOfYear: number;
	dateLabel: string;
	key: string;
};

export type MonthAxisTick = {
	dayOfYear: number;
	label: string;
};

type NormalizedQuote = {
	calendarIndex: number;
	close: number;
	date: Date;
	key: string;
	year: number;
};

type YearlyPattern = {
	high: number;
	low: number;
	quoteCount: number;
	values: Array<number | null>;
	year: number;
};

const MONTH_LABELS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

const SERIES_WINDOWS: Array<{
	key: SeasonalitySeriesKey;
	label: string;
	years: number;
}> = [
	{ key: "thirtyYear", label: "30Y", years: 30 },
	{ key: "fifteenYear", label: "15Y", years: 15 },
	{ key: "fiveYear", label: "5Y", years: 5 },
];

const CALENDAR_DAYS = buildCalendarDays();
const CALENDAR_INDEX_BY_KEY = new Map(
	CALENDAR_DAYS.map((day, index) => [day.key, index]),
);

export const MONTH_BOUNDARY_TICKS = buildMonthBoundaryTicks();
export const MONTH_LABEL_TICKS = buildMonthLabelTicks();

export function formatMonthTick(dayOfYear: number) {
	const monthTick = MONTH_LABEL_TICKS.find(
		(tick) => Math.abs(tick.dayOfYear - dayOfYear) < 0.01,
	);

	return monthTick?.label ?? "";
}

export function calculateYearPosition(
	close: number,
	low: number,
	high: number,
) {
	if (high === low) {
		return 50;
	}

	return ((close - low) / (high - low)) * 100;
}

export function buildSeasonalityChart(
	quotes: YahooChartQuote[],
): SeasonalityResult {
	const normalizedQuotes = normalizeQuotes(quotes);
	const emptyData = buildEmptyData();

	if (normalizedQuotes.length === 0) {
		return {
			data: emptyData,
			meta: {
				currentYear: null,
				latestDate: null,
				validQuoteCount: 0,
				series: buildEmptySeriesMeta([]),
			},
		};
	}

	const quotesByYear = groupQuotesByYear(normalizedQuotes);
	const latestQuote = normalizedQuotes[normalizedQuotes.length - 1];
	const currentYear = latestQuote.year;
	const historicalPatterns = new Map<number, YearlyPattern>();

	for (const [year, yearQuotes] of quotesByYear) {
		if (year >= currentYear) {
			continue;
		}

		const pattern = buildYearlyPattern(year, yearQuotes);

		if (pattern && pattern.quoteCount >= 2 && pattern.high > pattern.low) {
			historicalPatterns.set(year, pattern);
		}
	}

	const historicalYears = [...historicalPatterns.keys()].sort(
		(first, second) => first - second,
	);
	const seriesValues = buildHistoricalSeries(
		historicalYears,
		historicalPatterns,
	);
	const currentPattern = buildCurrentYearPattern(
		currentYear,
		quotesByYear.get(currentYear) ?? [],
		latestQuote.calendarIndex,
	);

	return {
		data: emptyData.map((point, index) => ({
			...point,
			thirtyYear: seriesValues.thirtyYear.values[index],
			fifteenYear: seriesValues.fifteenYear.values[index],
			fiveYear: seriesValues.fiveYear.values[index],
			currentYear: currentPattern?.values[index] ?? null,
		})),
		meta: {
			currentYear,
			latestDate: toIsoDate(latestQuote.date),
			validQuoteCount: normalizedQuotes.length,
			series: {
				thirtyYear: seriesValues.thirtyYear.meta,
				fifteenYear: seriesValues.fifteenYear.meta,
				fiveYear: seriesValues.fiveYear.meta,
			},
		},
	};
}

function buildHistoricalSeries(
	historicalYears: number[],
	historicalPatterns: Map<number, YearlyPattern>,
) {
	return SERIES_WINDOWS.reduce(
		(series, windowConfig) => {
			const selectedYears = historicalYears.slice(-windowConfig.years);
			const selectedPatterns = selectedYears
				.map((year) => historicalPatterns.get(year))
				.filter((pattern): pattern is YearlyPattern => Boolean(pattern));
			const available = selectedPatterns.length >= 2;
			const values = available
				? normalizeLine(buildAverageLine(selectedPatterns))
				: buildEmptyLine();

			series[windowConfig.key] = {
				values,
				meta: {
					label: windowConfig.label,
					requestedYears: windowConfig.years,
					actualYears: selectedPatterns.length,
					years: selectedYears,
					available,
					unavailableReason: available
						? undefined
						: `Need at least 2 completed years for ${windowConfig.label}.`,
				},
			};

			return series;
		},
		{} as Record<
			SeasonalitySeriesKey,
			{ meta: SeasonalitySeriesMeta; values: Array<number | null> }
		>,
	);
}

function buildAverageLine(patterns: YearlyPattern[]) {
	return CALENDAR_DAYS.map((_, index) => {
		const values = patterns
			.map((pattern) => pattern.values[index])
			.filter((value): value is number => value !== null);

		if (values.length === 0) {
			return null;
		}

		return values.reduce((sum, value) => sum + value, 0) / values.length;
	});
}

function buildCalendarDays() {
	const days: CalendarDay[] = [];

	for (let month = 0; month < 12; month += 1) {
		const daysInMonth = new Date(Date.UTC(2001, month + 1, 0)).getUTCDate();

		for (let day = 1; day <= daysInMonth; day += 1) {
			days.push({
				dayOfYear: days.length + 1,
				dateLabel: `${MONTH_LABELS[month]} ${day}`,
				key: buildDateKey(month + 1, day),
			});
		}
	}

	return days;
}

function buildMonthBoundaryTicks() {
	const boundaries: number[] = [];
	let nextMonthStart = 1;

	for (let month = 0; month < 12; month += 1) {
		if (month > 0) {
			boundaries.push(nextMonthStart - 0.5);
		}

		nextMonthStart += new Date(Date.UTC(2001, month + 1, 0)).getUTCDate();
	}

	return boundaries;
}

function buildMonthLabelTicks(): MonthAxisTick[] {
	const ticks: MonthAxisTick[] = [];
	let monthStart = 1;

	for (let month = 0; month < 12; month += 1) {
		const daysInMonth = new Date(Date.UTC(2001, month + 1, 0)).getUTCDate();
		const monthEnd = monthStart + daysInMonth - 1;

		ticks.push({
			dayOfYear: (monthStart + monthEnd) / 2,
			label: MONTH_LABELS[month],
		});

		monthStart = monthEnd + 1;
	}

	return ticks;
}

function buildCurrentYearPattern(
	year: number,
	quotes: NormalizedQuote[],
	latestCalendarIndex: number,
) {
	if (quotes.length === 0) {
		return null;
	}

	return buildYearlyPattern(year, quotes, latestCalendarIndex);
}

function buildDateKey(month: number, day: number) {
	return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildEmptyData(): SeasonalityDataPoint[] {
	return CALENDAR_DAYS.map((day) => ({
		dayOfYear: day.dayOfYear,
		dateLabel: day.dateLabel,
		thirtyYear: null,
		fifteenYear: null,
		fiveYear: null,
		currentYear: null,
	}));
}

function buildEmptyLine() {
	return Array<number | null>(CALENDAR_DAYS.length).fill(null);
}

function buildEmptySeriesMeta(
	historicalYears: number[],
): Record<SeasonalitySeriesKey, SeasonalitySeriesMeta> {
	return SERIES_WINDOWS.reduce(
		(series, windowConfig) => {
			const selectedYears = historicalYears.slice(-windowConfig.years);

			series[windowConfig.key] = {
				label: windowConfig.label,
				requestedYears: windowConfig.years,
				actualYears: selectedYears.length,
				years: selectedYears,
				available: false,
				unavailableReason: `Need at least 2 completed years for ${windowConfig.label}.`,
			};

			return series;
		},
		{} as Record<SeasonalitySeriesKey, SeasonalitySeriesMeta>,
	);
}

function buildYearlyPattern(
	year: number,
	quotes: NormalizedQuote[],
	stopAtIndex = CALENDAR_DAYS.length - 1,
): YearlyPattern | null {
	const quotesByCalendarIndex = new Map<number, NormalizedQuote>();

	for (const quote of quotes) {
		if (quote.calendarIndex <= stopAtIndex) {
			quotesByCalendarIndex.set(quote.calendarIndex, quote);
		}
	}

	const yearQuotes = [...quotesByCalendarIndex.values()];

	if (yearQuotes.length === 0) {
		return null;
	}

	const closes = yearQuotes.map((quote) => quote.close);
	const low = Math.min(...closes);
	const high = Math.max(...closes);
	const rawValues = buildEmptyLine();

	for (const quote of yearQuotes) {
		rawValues[quote.calendarIndex] = calculateYearPosition(
			quote.close,
			low,
			high,
		);
	}

	return {
		high,
		low,
		quoteCount: yearQuotes.length,
		values: fillMissingDays(rawValues, stopAtIndex),
		year,
	};
}

function fillMissingDays(values: Array<number | null>, stopAtIndex: number) {
	const filledValues = buildEmptyLine();
	const firstValueIndex = values.findIndex(
		(value, index) => index <= stopAtIndex && value !== null,
	);

	if (firstValueIndex === -1) {
		return filledValues;
	}

	let lastValue = values[firstValueIndex];

	for (let index = 0; index <= stopAtIndex; index += 1) {
		if (index >= firstValueIndex && values[index] !== null) {
			lastValue = values[index];
		}

		filledValues[index] = lastValue;
	}

	return filledValues;
}

function groupQuotesByYear(quotes: NormalizedQuote[]) {
	return quotes.reduce((groups, quote) => {
		const yearQuotes = groups.get(quote.year) ?? [];
		yearQuotes.push(quote);
		groups.set(quote.year, yearQuotes);
		return groups;
	}, new Map<number, NormalizedQuote[]>());
}

function normalizeLine(values: Array<number | null>) {
	const finiteValues = values.filter(
		(value): value is number => value !== null,
	);

	if (finiteValues.length === 0) {
		return buildEmptyLine();
	}

	const low = Math.min(...finiteValues);
	const high = Math.max(...finiteValues);

	if (high === low) {
		return values.map((value) => (value === null ? null : 50));
	}

	return values.map((value) =>
		value === null ? null : ((value - low) / (high - low)) * 100,
	);
}

function normalizeQuotes(quotes: YahooChartQuote[]) {
	return quotes
		.map((quote) => normalizeQuote(quote))
		.filter((quote): quote is NormalizedQuote => Boolean(quote))
		.sort((first, second) => first.date.getTime() - second.date.getTime());
}

function normalizeQuote(quote: YahooChartQuote): NormalizedQuote | null {
	if (typeof quote.close !== "number" || !Number.isFinite(quote.close)) {
		return null;
	}

	const date = quote.date instanceof Date ? quote.date : new Date(quote.date);

	if (!Number.isFinite(date.getTime())) {
		return null;
	}

	const year = date.getUTCFullYear();
	const key = buildDateKey(date.getUTCMonth() + 1, date.getUTCDate());
	const calendarIndex = CALENDAR_INDEX_BY_KEY.get(key);

	if (calendarIndex === undefined) {
		return null;
	}

	return {
		calendarIndex,
		close: quote.close,
		date,
		key,
		year,
	};
}

function toIsoDate(date: Date) {
	return date.toISOString().slice(0, 10);
}
