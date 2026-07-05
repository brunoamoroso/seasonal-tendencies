import { describe, expect, it } from "vitest";

import {
	buildSeasonalityChart,
	calculateYearPosition,
	MONTH_BOUNDARY_TICKS,
	MONTH_LABEL_TICKS,
	type SeasonalityResult,
	type SeasonalitySeriesKey,
	type YahooChartQuote,
} from "./seasonality";

describe("calculateYearPosition", () => {
	it("matches the MRCI example calculations", () => {
		expect(calculateYearPosition(16, 10, 40)).toBeCloseTo(20);
		expect(calculateYearPosition(28, 25, 45)).toBeCloseTo(15);
	});
});

describe("buildSeasonalityChart", () => {
	it("excludes the latest quote year from historical averages", () => {
		const result = buildSeasonalityChart([
			...yearQuotes(2020, [10, 20, 30]),
			...yearQuotes(2021, [15, 25, 35]),
			...yearQuotes(2022, [100, 200, 300]),
		]);

		expect(result.meta.currentYear).toBe(2022);
		expect(result.meta.series.fiveYear.years).toEqual([2020, 2021]);
	});

	it("selects the most recent completed valid years for each window", () => {
		const quotes: YahooChartQuote[] = [];

		for (let year = 1980; year <= 2023; year += 1) {
			quotes.push(...yearQuotes(year, [10 + year, 20 + year, 30 + year]));
		}

		const result = buildSeasonalityChart(quotes);

		expect(result.meta.currentYear).toBe(2023);
		expect(result.meta.series.fiveYear.years).toEqual([
			2018, 2019, 2020, 2021, 2022,
		]);
		expect(result.meta.series.fifteenYear.years).toEqual(range(2008, 2022));
		expect(result.meta.series.thirtyYear.years).toEqual(range(1993, 2022));
	});

	it("excludes leap day from the calendar axis", () => {
		const result = buildSeasonalityChart([
			quote(2020, 1, 1, 10),
			quote(2020, 2, 29, 20),
			quote(2020, 12, 31, 30),
			quote(2021, 1, 1, 11),
			quote(2021, 6, 1, 21),
			quote(2021, 12, 31, 31),
			quote(2022, 1, 1, 12),
		]);

		expect(result.data).toHaveLength(365);
		expect(result.data.some((point) => point.dateLabel === "Feb 29")).toBe(
			false,
		);
		expect(result.data[58]?.dateLabel).toBe("Feb 28");
		expect(result.data[59]?.dateLabel).toBe("Mar 1");
	});

	it("fills missing non-trading days without shifting the calendar", () => {
		const result = buildSeasonalityChart([
			quote(2021, 1, 3, 10),
			quote(2021, 1, 5, 20),
			quote(2021, 12, 31, 30),
			quote(2022, 1, 3, 10),
			quote(2022, 1, 5, 20),
			quote(2022, 12, 31, 30),
			quote(2023, 1, 5, 20),
		]);

		expect(valueFor(result, "Jan 4", "fiveYear")).toBeCloseTo(0);
		expect(valueFor(result, "Jan 5", "fiveYear")).toBeCloseTo(50);
	});

	it("normalizes composite seasonal lines to a 0-100 index", () => {
		const result = buildSeasonalityChart([
			quote(2021, 1, 1, 0),
			quote(2021, 6, 1, 100),
			quote(2021, 12, 31, 20),
			quote(2022, 1, 1, 40),
			quote(2022, 6, 1, 0),
			quote(2022, 12, 31, 100),
			quote(2023, 1, 1, 10),
			quote(2023, 1, 2, 20),
		]);
		const values = result.data
			.map((point) => point.fiveYear)
			.filter((value): value is number => value !== null);

		expect(Math.min(...values)).toBeCloseTo(0);
		expect(Math.max(...values)).toBeCloseTo(100);
	});

	it("stops the current-year line after the latest quote date", () => {
		const result = buildSeasonalityChart([
			...yearQuotes(2021, [10, 20, 30]),
			...yearQuotes(2022, [11, 21, 31]),
			quote(2023, 1, 3, 10),
			quote(2023, 1, 5, 20),
		]);

		expect(valueFor(result, "Jan 5", "currentYear")).toBeCloseTo(100);
		expect(valueFor(result, "Jan 6", "currentYear")).toBeNull();
	});

	it("marks unavailable series when fewer than two completed years exist", () => {
		const result = buildSeasonalityChart([
			quote(2023, 1, 3, 10),
			quote(2023, 1, 5, 20),
		]);

		expect(result.meta.series.fiveYear.available).toBe(false);
		expect(result.data.every((point) => point.fiveYear === null)).toBe(true);
	});
});

describe("month axis ticks", () => {
	it("centers month labels and places month boundaries between days", () => {
		expect(MONTH_LABEL_TICKS[0]).toEqual({ dayOfYear: 16, label: "Jan" });
		expect(MONTH_LABEL_TICKS[1]).toEqual({ dayOfYear: 45.5, label: "Feb" });
		expect(MONTH_LABEL_TICKS[11]).toEqual({ dayOfYear: 350, label: "Dec" });

		expect(MONTH_BOUNDARY_TICKS[0]).toBe(31.5);
		expect(MONTH_BOUNDARY_TICKS[1]).toBe(59.5);
		expect(MONTH_BOUNDARY_TICKS).toHaveLength(11);
	});
});

function quote(
	year: number,
	month: number,
	day: number,
	close: number,
): YahooChartQuote {
	return {
		close,
		date: new Date(Date.UTC(year, month - 1, day)).toISOString(),
	};
}

function range(start: number, end: number) {
	return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function valueFor(
	result: SeasonalityResult,
	dateLabel: string,
	key: SeasonalitySeriesKey | "currentYear",
) {
	const point = result.data.find(
		(candidate) => candidate.dateLabel === dateLabel,
	);

	if (!point) {
		throw new Error(`Missing ${dateLabel}`);
	}

	return point[key];
}

function yearQuotes(
	year: number,
	[low, middle, high]: [number, number, number],
) {
	return [
		quote(year, 1, 1, low),
		quote(year, 6, 1, middle),
		quote(year, 12, 31, high),
	];
}
