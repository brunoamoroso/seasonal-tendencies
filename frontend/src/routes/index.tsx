import { createFileRoute } from "@tanstack/react-router";
import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "#/components/ui/chart";
import {
	buildSeasonalityChart,
	formatMonthTick,
	MONTH_BOUNDARY_TICKS,
	MONTH_LABEL_TICKS,
	type SeasonalityResult,
	type YahooChartQuote,
} from "#/lib/seasonality";
import { SearchSymbol } from "#/components/search-symbol";
import { getSymbolData } from "#/api/api";

export const Route = createFileRoute("/")({ component: Home });

type YahooChartResponse = {
	meta?: {
		longName?: string;
		shortName?: string;
		symbol?: string;
	};
	quotes?: YahooChartQuote[];
};

const chartConfig = {
	thirtyYear: {
		label: "30Y",
		color: "#2563eb",
	},
	fifteenYear: {
		label: "15Y",
		color: "#16a34a",
	},
	fiveYear: {
		label: "5Y",
		color: "#d97706",
	},
	currentYear: {
		label: "Current Year",
		color: "#dc2626",
	},
} satisfies ChartConfig;

type ChartSeriesKey = keyof typeof chartConfig;

const DEFAULT_SYMBOL = "DX-Y.NYB";
const DEFAULT_LINE_VISIBILITY: Record<ChartSeriesKey, boolean> = {
	thirtyYear: true,
	fifteenYear: true,
	fiveYear: true,
	currentYear: true,
};

function Home() {
	const [inputSymbol, setInputSymbol] = useState(DEFAULT_SYMBOL);
	const [loadedSymbol, setLoadedSymbol] = useState(DEFAULT_SYMBOL);
	const [chartResult, setChartResult] = useState<SeasonalityResult | null>(
		null,
	);
	const [instrumentName, setInstrumentName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [lineVisibility, setLineVisibility] = useState(DEFAULT_LINE_VISIBILITY);

	const unavailableSeries = useMemo(() => {
		if (!chartResult) {
			return [];
		}

		return Object.values(chartResult.meta.series).filter(
			(series) => !series.available,
		);
	}, [chartResult]);

	const availableSeries = useMemo(() => {
		if (!chartResult) {
			return [];
		}

		return Object.entries(chartResult.meta.series).filter(
			([, series]) => series.available,
		);
	}, [chartResult]);

	const legendItems = useMemo(() => {
		if (!chartResult) {
			return [];
		}

		const historicalItems = availableSeries.map(([key, series]) => ({
			color: chartConfig[key as ChartSeriesKey].color,
			detail: `${series.actualYears} yrs`,
			key: key as ChartSeriesKey,
			label: series.label,
		}));

		return [
			...historicalItems,
			{
				color: chartConfig.currentYear.color,
				detail: String(chartResult.meta.currentYear),
				key: "currentYear" as const,
				label: "Current",
			},
		];
	}, [availableSeries, chartResult]);

	const loadSymbol = useCallback(async (symbol: string) => {
		const nextSymbol = symbol.trim().toUpperCase();

		if (!nextSymbol) {
			setError("Enter a symbol.");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const yahooChart = await getSymbolData(nextSymbol) as YahooChartResponse;
			const seasonality = buildSeasonalityChart(yahooChart.quotes ?? []);

			setChartResult(seasonality);
			setLoadedSymbol(yahooChart.meta?.symbol ?? nextSymbol);
			setInputSymbol(yahooChart.meta?.symbol ?? nextSymbol);
			setInstrumentName(
				yahooChart.meta?.longName ?? yahooChart.meta?.shortName ?? "",
			);
		} catch (loadError) {
			const message =
				loadError instanceof Error
					? loadError.message
					: "Unable to load symbol data.";
			setChartResult(null);
			setInstrumentName("");
			setLoadedSymbol(nextSymbol);
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadSymbol(DEFAULT_SYMBOL);
	}, [loadSymbol]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		void loadSymbol(inputSymbol);
	}

	function toggleLine(seriesKey: ChartSeriesKey) {
		setLineVisibility((currentVisibility) => ({
			...currentVisibility,
			[seriesKey]: !currentVisibility[seriesKey],
		}));
	}

	return (
		<main className="min-h-screen bg-background text-foreground">
			<div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
				<header className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="space-y-1">
						<p className="text-sm font-medium text-muted-foreground">
							Seasonal index
						</p>
						<h1 className="text-3xl font-semibold tracking-normal">
							{loadedSymbol}
						</h1>
						{instrumentName ? (
							<p className="text-sm text-muted-foreground">{instrumentName}</p>
						) : null}
					</div>

					<form
						className="flex w-full flex-col gap-2 sm:max-w-sm sm:flex-row justify-end"
						onSubmit={handleSubmit}
					>
						<SearchSymbol loadSymbol={loadSymbol} />
						{/* <button
							className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
							disabled={isLoading}
							type="submit"
						>
							{isLoading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Search className="h-4 w-4" />
							)}
							Load
						</button> */}
					</form>
				</header>

				<section className="flex flex-1 flex-col gap-4">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-xl font-semibold tracking-normal">
								Seasonality
							</h2>
							<p className="text-sm text-muted-foreground">
								{chartResult?.meta.latestDate
									? `Updated through ${chartResult.meta.latestDate}`
									: "No data loaded"}
							</p>
						</div>

						{chartResult ? (
							<fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0 text-xs text-muted-foreground">
								<legend className="sr-only">Chart lines</legend>
								{legendItems.map((item) => {
									const isVisible = lineVisibility[item.key];

									return (
										<button
											aria-pressed={isVisible}
											className="inline-flex h-7 items-center gap-1.5 rounded-md border px-2 py-1 text-left transition hover:bg-muted focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 data-[visible=false]:opacity-45"
											data-visible={isVisible}
											key={item.key}
											onClick={() => toggleLine(item.key)}
											type="button"
										>
											<span
												className="h-2 w-2 rounded-[2px]"
												style={{
													backgroundColor: isVisible
														? item.color
														: "transparent",
													border: `1px solid ${item.color}`,
												}}
											/>
											<span>
												{item.label}: {item.detail}
											</span>
										</button>
									);
								})}
							</fieldset>
						) : null}
					</div>

					<div className="min-h-112 rounded-lg border bg-card p-3 shadow-xs sm:p-4">
						{chartResult?.meta.validQuoteCount === 0 ? (
							<StateMessage
								title="No close-price data"
								message={`Yahoo did not return usable daily close data for ${loadedSymbol}.`}
							/>
						) : error ? (
							<StateMessage title="Could not load symbol" message={error} />
						) : chartResult ? (
							<ChartContainer
								className="h-[32rem] w-full"
								config={chartConfig}
								initialDimension={{ width: 800, height: 512 }}
							>
								<LineChart
									accessibilityLayer
									data={chartResult.data}
									margin={{ bottom: 12, left: 8, right: 12, top: 12 }}
								>
									<CartesianGrid strokeDasharray="3 3" vertical={false} />
									<XAxis
										axisLine={false}
										allowDataOverflow
										dataKey="dayOfYear"
										domain={[0.5, 365.5]}
										interval={0}
										scale="linear"
										tickFormatter={formatMonthTick}
										tickLine={false}
										tickMargin={10}
										ticks={MONTH_LABEL_TICKS.map((tick) => tick.dayOfYear)}
										type="number"
									/>
									<YAxis
										axisLine={false}
										domain={[0, 100]}
										tickFormatter={(value) => `${value}`}
										tickLine={false}
										tickMargin={8}
										ticks={[0, 20, 40, 60, 80, 100]}
										width={36}
									/>
									{MONTH_BOUNDARY_TICKS.map((dayOfYear) => (
										<ReferenceLine
											ifOverflow="visible"
											key={dayOfYear}
											stroke="var(--border)"
											strokeDasharray="3 3"
											strokeOpacity={0.9}
											x={dayOfYear}
										/>
									))}
									<ChartTooltip
										content={
											<ChartTooltipContent
												labelFormatter={(_, payload) =>
													payload?.[0]?.payload?.dateLabel ?? ""
												}
												formatter={(value, name) => (
													<>
														<span className="text-muted-foreground">
															{chartConfig[name as keyof typeof chartConfig]
																?.label ?? name}
														</span>
														<span className="font-mono font-medium text-foreground tabular-nums">
															{formatSeasonalityValue(value)}
														</span>
													</>
												)}
											/>
										}
									/>
									{chartResult.meta.series.thirtyYear.available &&
									lineVisibility.thirtyYear ? (
										<Line
											connectNulls={false}
											dataKey="thirtyYear"
											dot={false}
											isAnimationActive={false}
											stroke="var(--color-thirtyYear)"
											strokeWidth={2}
											type="monotone"
										/>
									) : null}
									{chartResult.meta.series.fifteenYear.available &&
									lineVisibility.fifteenYear ? (
										<Line
											connectNulls={false}
											dataKey="fifteenYear"
											dot={false}
											isAnimationActive={false}
											stroke="var(--color-fifteenYear)"
											strokeWidth={2}
											type="monotone"
										/>
									) : null}
									{chartResult.meta.series.fiveYear.available &&
									lineVisibility.fiveYear ? (
										<Line
											connectNulls={false}
											dataKey="fiveYear"
											dot={false}
											isAnimationActive={false}
											stroke="var(--color-fiveYear)"
											strokeWidth={2}
											type="monotone"
										/>
									) : null}
									{lineVisibility.currentYear ? (
										<Line
											connectNulls={false}
											dataKey="currentYear"
											dot={false}
											isAnimationActive={false}
											stroke="var(--color-currentYear)"
											strokeDasharray="6 4"
											strokeWidth={2}
											type="monotone"
										/>
									) : null}
								</LineChart>
							</ChartContainer>
						) : (
							<StateMessage
								title={isLoading ? "Loading" : "Ready"}
								message={
									isLoading
										? `Fetching ${loadedSymbol} daily history.`
										: "Enter a symbol to load the chart."
								}
							/>
						)}
					</div>

					{unavailableSeries.length > 0 ? (
						<div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
							{unavailableSeries.map((series) => (
								<p key={series.label}>{series.unavailableReason}</p>
							))}
						</div>
					) : null}
				</section>
			</div>
		</main>
	);
}

function StateMessage({ message, title }: { message: string; title: string }) {
	return (
		<div className="flex h-[32rem] flex-col items-center justify-center gap-2 text-center">
			<p className="text-base font-medium">{title}</p>
			<p className="max-w-md text-sm text-muted-foreground">{message}</p>
		</div>
	);
}

function formatSeasonalityValue(value: unknown) {
	if (typeof value !== "number") {
		return "";
	}

	return value.toFixed(2);
}
