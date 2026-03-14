import { AGENTS, SENTIMENT_LEVELS } from './agents';

// Deterministic seeded random for reproducible simulations
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Shorten verbose event text into a concise reference so agents don't parrot the full seed
function shortenEvent(event) {
  if (/fed.*signal.*cut|rate cut/i.test(event)) return 'this Fed dovish pivot';
  if (/fed.*rate|interest rate.*steady|fomc|rate.*hold/i.test(event)) return 'this Fed rate decision';
  if (/rate hike|hike.*rate/i.test(event)) return 'this rate hike';
  if (/nvid|nvidia.*revenue|nvidia.*record/i.test(event)) return "NVIDIA's blowout quarter";
  if (/nvid|nvidia/i.test(event)) return 'the NVIDIA catalyst';
  if (/bitcoin.*100|btc.*100/i.test(event)) return "Bitcoin breaking $100K";
  if (/bitcoin|btc/i.test(event)) return 'this Bitcoin move';
  if (/ethereum|eth\b/i.test(event)) return 'this Ethereum catalyst';
  if (/crypto/i.test(event)) return 'this crypto rally';
  if (/tariff|trade war/i.test(event)) return 'these new tariffs';
  if (/bank.*collaps|contagion/i.test(event)) return 'this banking crisis';
  if (/recession/i.test(event)) return 'these recession signals';
  if (/inflation.*re-accelerat|inflation.*hot/i.test(event)) return 'this inflation scare';
  if (/inflation|cpi/i.test(event)) return 'this inflation data';
  if (/china.*stimulus/i.test(event)) return "China's massive stimulus";
  if (/china/i.test(event)) return 'the China situation';
  if (/oil.*spike|opec/i.test(event)) return 'this oil shock';
  if (/correction|down.*%/i.test(event)) return 'this market correction';
  if (/tesla/i.test(event)) return 'the Tesla news';
  if (/japan.*rate/i.test(event)) return "Japan's rate surprise";
  if (/debt.*trillion|downgrad/i.test(event)) return 'this fiscal crisis';
  if (/apple.*openai|merger/i.test(event)) return 'this mega-merger';
  if (/meme.*stock|retail.*mania/i.test(event)) return 'this retail frenzy';
  if (/ai.*bubble|ai.*spend/i.test(event)) return 'the AI spending question';
  if (/war|conflict|military/i.test(event)) return 'this geopolitical escalation';
  if (/apple|aapl/i.test(event)) return 'the Apple catalyst';
  if (/invest in (\S+)/i.test(event)) {
    const m = event.match(/invest in (\S+)/i);
    return `the ${m[1].replace('?', '')} thesis`;
  }
  // Default: first meaningful clause, capitalized properly
  const clause = event.split(/[,;—]/).shift().trim();
  if (clause.length > 45) return 'this development';
  return 'this catalyst';
}

// Generate an agent's response to an event, given prior conversation context
function generateAgentResponse(agent, event, priorRound, allAgentsPrior, roundNum, rng) {
  const sentimentKeys = Object.keys(SENTIMENT_LEVELS);

  // Base sentiment influenced by agent bias
  let sentimentIndex = 2; // neutral
  if (agent.bias === 'bullish') sentimentIndex = 1;
  if (agent.bias === 'bearish') sentimentIndex = 3;

  // Event impact analysis
  const eventLower = event.toLowerCase();
  const isBullishEvent = /rate cut|beat|surge|rally|bullish|upgrade|growth|strong/i.test(eventLower);
  const isBearishEvent = /miss|crash|war|recession|downgrade|weak|decline|inflation|tariff/i.test(eventLower);
  const isCryptoEvent = /bitcoin|crypto|ethereum|defi|blockchain/i.test(eventLower);
  const isTechEvent = /nvidia|ai|semiconductor|cloud|tech|apple|google|microsoft/i.test(eventLower);
  const isFedEvent = /fed|rate|powell|fomc|monetary|interest/i.test(eventLower);

  // Shift sentiment based on event
  if (isBullishEvent) sentimentIndex -= 1;
  if (isBearishEvent) sentimentIndex += 1;

  // Agent-specific reactions
  if (agent.id === 'crypto-max' && isCryptoEvent) sentimentIndex -= 1;
  if (agent.id === 'tech-growth' && isTechEvent) sentimentIndex -= 1;
  if (agent.id === 'fed-watcher' && isFedEvent) sentimentIndex = isBullishEvent ? 0 : 3;
  if (agent.id === 'doom-bear') sentimentIndex = Math.min(sentimentIndex + 1, 4);
  if (agent.id === 'geopolitical' && isBearishEvent) sentimentIndex = Math.min(sentimentIndex + 1, 4);
  if (agent.id === 'price-action') sentimentIndex = 2 + (isBullishEvent ? -1 : isBearishEvent ? 1 : 0); // purely reactive to price action

  // === PERSUASION SYSTEM: Agents evaluate others' arguments ===
  let persuadedBy = null;
  let persuasionReason = null;
  let concession = null;

  if (allAgentsPrior && allAgentsPrior.length > 0) {
    const avgSentiment = allAgentsPrior.reduce((sum, a) => {
      return sum + (SENTIMENT_LEVELS[a.sentiment]?.score || 0);
    }, 0) / allAgentsPrior.length;

    // Contrarian agents may flip
    if (agent.id === 'value-hunter' && avgSentiment > 1) {
      sentimentIndex = Math.min(sentimentIndex + 1, 4);
    }
    if (agent.id === 'retail-pulse' && avgSentiment < -1) {
      sentimentIndex = Math.max(sentimentIndex - 1, 0);
    }
    if (agent.id === 'volatility-arb') {
      const variance = allAgentsPrior.reduce((sum, a) => {
        const s = SENTIMENT_LEVELS[a.sentiment]?.score || 0;
        return sum + Math.pow(s - avgSentiment, 2);
      }, 0) / allAgentsPrior.length;
      if (variance > 1.5) sentimentIndex = 0;
    }

    // Find the most persuasive opposing argument
    const myScore = SENTIMENT_LEVELS[sentimentKeys[sentimentIndex]]?.score || 0;
    const opponents = allAgentsPrior.filter(p => {
      const theirScore = SENTIMENT_LEVELS[p.sentiment]?.score || 0;
      return (myScore > 0 && theirScore < 0) || (myScore < 0 && theirScore > 0);
    });

    if (opponents.length > 0) {
      // Strongest opponent = highest confidence in opposing direction
      const strongestOpponent = opponents.sort((a, b) => b.confidence - a.confidence)[0];

      // Persuasion probability: based on opponent's confidence, our agent's flexibility, and round pressure
      const opponentStrength = strongestOpponent.confidence / 100;
      const ourFlexibility = 1 - agent.riskTolerance; // lower risk tolerance = more willing to reconsider
      const roundPressure = Math.min(roundNum * 0.08, 0.3); // later rounds = more pressure to converge
      const coalitionPressure = opponents.length >= 6 ? 0.15 : opponents.length >= 4 ? 0.08 : 0;

      const persuasionChance = opponentStrength * 0.3 + ourFlexibility * 0.15 + roundPressure + coalitionPressure;

      if (rng() < persuasionChance && roundNum >= 2) {
        // Agent is persuaded! Shift toward opponent
        const targetScore = SENTIMENT_LEVELS[strongestOpponent.sentiment]?.score || 0;
        if (targetScore > myScore) {
          sentimentIndex = Math.max(0, sentimentIndex - 1); // shift more bullish
        } else {
          sentimentIndex = Math.min(4, sentimentIndex + 1); // shift more bearish
        }
        persuadedBy = strongestOpponent;
        persuasionReason = getPersuasionReason(agent, strongestOpponent, rng);
        concession = getConcessionText(agent, strongestOpponent, rng);
      } else if (rng() < 0.4 && roundNum >= 2) {
        // Partial concession without full flip
        concession = getPartialConcession(agent, strongestOpponent, rng);
      }
    }

    // Strong majority pressure (7+ agents on one side can sway fence-sitters)
    const bullCount = allAgentsPrior.filter(p => (SENTIMENT_LEVELS[p.sentiment]?.score || 0) > 0).length;
    const bearCount = allAgentsPrior.filter(p => (SENTIMENT_LEVELS[p.sentiment]?.score || 0) < 0).length;

    if (bullCount >= 7 && myScore <= 0 && sentimentIndex >= 2 && rng() < 0.25 && roundNum >= 3) {
      sentimentIndex = Math.max(sentimentIndex - 1, 1);
      persuasionReason = `The weight of ${bullCount} bullish voices and their collective data forced a reassessment.`;
    } else if (bearCount >= 7 && myScore >= 0 && sentimentIndex <= 2 && rng() < 0.25 && roundNum >= 3) {
      sentimentIndex = Math.min(sentimentIndex + 1, 3);
      persuasionReason = `${bearCount} agents presenting bearish evidence was too compelling to ignore.`;
    }
  }

  // Add some randomness (less than before — persuasion is the main driver now)
  const noise = rng() < 0.3 ? (Math.floor(rng() * 3) - 1) : 0;
  sentimentIndex = Math.max(0, Math.min(4, sentimentIndex + noise));

  const sentiment = sentimentKeys[sentimentIndex];
  const confidence = Math.round(40 + rng() * 55);

  // Generate analysis text
  const analysis = generateAnalysisText(agent, event, sentiment, confidence, allAgentsPrior, roundNum, rng);

  // Generate specific trade ideas
  const trades = generateTradeIdeas(agent, sentiment, event, rng);

  // Track the previous sentiment for flip detection
  const prevResponse = allAgentsPrior?.find(p => p.agentId === agent.id);
  const prevScore = prevResponse ? (SENTIMENT_LEVELS[prevResponse.sentiment]?.score || 0) : null;
  const newScore = SENTIMENT_LEVELS[sentiment]?.score || 0;
  const didFlip = prevScore !== null && ((prevScore > 0 && newScore < 0) || (prevScore < 0 && newScore > 0));

  // Generate data sources backing this agent's argument
  const dataSources = generateDataSources(agent, sentiment, rng);

  return {
    agentId: agent.id,
    agent,
    sentiment,
    confidence,
    analysis,
    trades,
    dataSources,
    round: roundNum,
    timestamp: new Date().toISOString(),
    // Persuasion tracking
    persuadedBy: persuadedBy ? { agentId: persuadedBy.agentId, name: persuadedBy.agent?.name || 'Unknown' } : null,
    persuasionReason,
    concession,
    flipped: didFlip,
    previousSentiment: prevResponse?.sentiment || null,
  };
}

// === Persuasion dialogue generators ===
function getPersuasionReason(agent, opponent, rng) {
  const reasons = [
    `${opponent.agent?.name || 'Their'} data on the credit markets was too specific to dismiss. I had to reconsider.`,
    `The quantitative evidence ${opponent.agent?.name || 'they'} presented contradicts my thesis. Intellectual honesty demands I adjust.`,
    `${opponent.agent?.name || 'They'} made a point about the risk-reward asymmetry that I can't refute with my current data.`,
    `After reviewing ${opponent.agent?.name || 'their'}'s argument more carefully, I see a blind spot in my analysis.`,
    `The market structure evidence ${opponent.agent?.name || 'they'} cited aligns with signals I've been trying to explain away.`,
  ];
  return reasons[Math.floor(rng() * reasons.length)];
}

function getConcessionText(agent, opponent, rng) {
  const concessions = [
    `I have to admit, ${opponent.agent?.name || 'you'} raised a valid point. I was underweighting that risk factor.`,
    `Fair point from ${opponent.agent?.name || 'the other side'}. I'm adjusting my confidence and shifting my position.`,
    `${opponent.agent?.name || 'Their'} argument changed my mind. The evidence is stronger than I initially credited.`,
    `I was wrong to dismiss ${opponent.agent?.name || 'their'}'s concern. Updating my model and revising my stance.`,
  ];
  return concessions[Math.floor(rng() * concessions.length)];
}

function getPartialConcession(agent, opponent, rng) {
  const partials = [
    `${opponent.agent?.name || 'You'} make a fair point about the downside risk, but I still think the base case holds. Reducing my conviction slightly.`,
    `I'll concede that ${opponent.agent?.name || 'their'} data on credit spreads is concerning. Not enough to flip me, but I'm tightening my stops.`,
    `Okay, ${opponent.agent?.name || "you've"} shown me something I hadn't considered. I'm not changing my position yet, but I'm watching that metric closely now.`,
    `That's a strong counter-argument from ${opponent.agent?.name || 'the other side'}. I maintain my view but with lower conviction than before.`,
  ];
  return partials[Math.floor(rng() * partials.length)];
}

function generateAnalysisText(agent, event, sentiment, confidence, priorAgents, roundNum, rng) {
  const sentimentLabel = SENTIMENT_LEVELS[sentiment].label;
  const shortEvent = shortenEvent(event);

  const analyses = {
    'macro-bull': {
      'strong-bull': [
        `This is exactly what the economy needs. ${shortEvent} — the underlying fundamentals are incredibly strong. GDP is tracking 3.1% annualized, ISM manufacturing just crossed back above 52, and real wage growth has been positive for 8 consecutive months. The capex cycle is broadening beyond just tech — industrials and energy are ramping capital spending. I'm adding to long positions across cyclicals, with a particular focus on financials where loan growth is reaccelerating. The consumer balance sheet is in the best shape since 2019, and the savings rate at 4.5% gives us a cushion. This expansion has at least another 12-18 months of runway.`,
        `The macro picture couldn't be clearer. With ${shortEvent}, we're looking at a Goldilocks scenario — growth above trend but not hot enough to force the Fed's hand. Employment remains robust with the prime-age participation rate at 80.7%, a multi-decade high. Consumer spending is holding up across both goods and services, and the housing market is stabilizing with inventory finally normalizing. Small business optimism is ticking higher too, which is a leading indicator that never lies. Full risk-on mode — I'm overweight equities by 15% and targeting cyclical leadership in my sector allocations.`,
      ],
      'bull': [
        `Constructive on the macro front. ${shortEvent} is net positive for growth assets. The expansion has legs — ISM new orders came in at 53.2, durable goods orders surprised to the upside by 2.3%, and business investment is accelerating. The labor market is softening gently, which is exactly what you want — enough slack to keep wages from overheating, but not enough to signal recession. Corporate profit margins are holding at 12.4% for the S&P, well above historical averages. I'm modestly overweight equities with a tilt toward quality cyclicals — industrials, materials, and select financials.`,
        `This plays into our base case. ${shortEvent} keeps the growth narrative intact. Not euphoric, but the risk-reward clearly favors being long equities here. The Conference Board LEI has stabilized and is showing nascent improvement. Housing starts are picking up, auto sales are running at a 16M SAAR, and the services economy — which is 70% of GDP — is on solid footing. I'm watching the 3-month moving average of payrolls, and at +190K it's right in the sweet spot. Positioning: slight overweight in risk with a barbell of quality growth and deep cyclicals.`,
      ],
      'neutral': [
        `Mixed signals from ${shortEvent}. The macro data is giving conflicting reads and I need more evidence before leaning either way. PMIs are right at the 50 line — neither expanding nor contracting. Retail sales came in flat last month, but the prior month was revised up significantly. The labor market is a coin flip — headline payrolls look fine but the household survey is weaker, and the JOLTS data shows quits falling. I'm watching three things closely: weekly initial claims, the ISM new orders-to-inventory ratio, and consumer confidence. Until at least two of those break in a clear direction, I'm staying balanced with a 50/50 allocation.`,
        `I'd characterize this as a wait-and-see moment. ${shortEvent} doesn't change the big picture, but it introduces enough uncertainty that I want to stay balanced. The yield curve just uninverted after 18 months, which historically is actually a recession warning, not a bullish signal. But GDP trackers are still showing 2%+ growth. We're in an unusual macro regime where the old playbooks don't fully apply. I'm hedging my bets — equal weight across sectors, modest duration, and keeping 10% in cash as dry powder.`,
      ],
      'bear': [
        `Concerning. ${shortEvent} is starting to show up in leading indicators and I'm growing uncomfortable with risk asset positioning. The labor market is softening faster than expected — temporary help employment has declined for 5 straight months, which has preceded every recession since 1970. Consumer credit delinquencies are ticking up, and the personal savings rate just dropped to 3.2%, suggesting consumers are stretching. If the labor market softens from here, we could see a meaningful deceleration. I'm trimming cyclical exposure by 20% and rotating into healthcare, staples, and short-duration bonds.`,
        `I'm not panicking, but ${shortEvent} has me reassessing my growth forecasts downward. The yield curve is telling us something — real yields at 2.3% are restrictive and the impact is starting to bite through the system with a lag. Auto loan delinquencies, credit card charge-offs, and commercial real estate stress are all flashing yellow. The ISM employment sub-index just dipped below 50. This doesn't mean recession is imminent, but the probability has moved from 15% to 35% in my framework. Rotating to defensive sectors and raising my cash allocation to 15%.`,
      ],
      'strong-bear': [
        `This is the inflection point I've been watching for. ${shortEvent} could cascade through the real economy faster than consensus expects. The Conference Board LEI has declined for 6 consecutive months, initial claims are trending higher, and the Sahm Rule is dangerously close to triggering — the 3-month moving average of unemployment is only 0.3pp from the threshold. Corporate earnings revisions have turned negative, and the credit impulse is the weakest since 2020. I'm moving to a risk-off posture — overweight cash and short-duration bonds, underweight equities by 20%, and adding tail hedges via SPX put spreads.`,
        `The macro deterioration is accelerating and the market hasn't priced it in. ${shortEvent} is a late-cycle signal that cannot be ignored. Real GDP growth is decelerating toward 1%, the output gap is closing, and the fiscal impulse is turning negative as pandemic-era programs fully expire. Bank lending standards are the tightest since 2008 — that's a fact, not an opinion. The next two payroll prints will be the moment of truth. I'm in full capital-preservation mode: 30% cash, 30% short-duration Treasuries, 20% quality defensive equities, and 20% in hedges including gold and long volatility.`,
      ],
    },
    'doom-bear': {
      'strong-bull': [
        `Even I have to admit ${shortEvent} is materially positive. The data has genuinely improved — credit spreads tightened 40bps, bank stress indicators are easing, and the systemic risk dashboard has moved from red to amber. But don't get complacent — we still have $34 trillion in government debt, $600B in commercial real estate maturities this year, and China's property sector is a ticking time bomb. I'm cautiously constructive for the first time in months, but I'm keeping every single one of my hedges in place. I've been wrong on timing before, and the market has humbled me, but the structural vulnerabilities haven't disappeared.`,
        `Fine, the data is undeniable. ${shortEvent} reduces tail risk significantly and I'm adjusting my positioning accordingly — reducing my short book by 30% and covering my most aggressive credit shorts. But I'm keeping my gold allocation, my VIX call spreads, and my Treasury allocation intact. The world is still fragile — we're one geopolitical shock, one credit event, one liquidity squeeze away from a cascade. The market's complacency is exactly what concerns me most. When everyone agrees it's fine, that's historically when it isn't.`,
      ],
      'bull': [
        `${shortEvent} is mildly positive, I'll grant that. But the credit spreads are still too tight for the risk we're carrying. Investment grade spreads at 95bps and high yield at 340bps? That's pricing in perfection, and perfection never lasts. I'm slightly less bearish than last round — moving from aggressively short to modestly defensive — but I am NOT bullish. There's a difference between "less bad" and "good," and people constantly confuse the two. The structural problems — excessive leverage, fiscal deficits, demographic headwinds — are long-term issues that this one data point doesn't solve.`,
      ],
      'neutral': [
        `${shortEvent} doesn't move the needle for me. The fundamental vulnerabilities — $34 trillion in government debt, $1.2 trillion in annual deficit spending, commercial real estate losses that banks haven't marked yet, geopolitical tinderboxes in three continents — remain unchanged. Everyone is staring at this one catalyst while ignoring the structural rot beneath the surface. Bank unrealized losses are still $700 billion. Consumer debt just hit $17.5 trillion. The 60-day delinquency rate on subprime auto is at 2008 levels. But sure, let's celebrate ${shortEvent}. I'll stay defensive until someone shows me how we resolve these imbalances without pain.`,
        `Everyone's celebrating ${shortEvent} but nobody's looking at the leverage in the system. Total private sector credit to GDP is at 260% — higher than 2007. The shadow banking system has grown to $60 trillion with minimal regulatory oversight. Bank reserve requirements are at zero. The entire system is held together by confidence, and confidence can evaporate overnight. I'll stay defensive until the credit cycle actually turns — and by "turns" I mean credit growth exceeds credit losses sustainably, which we haven't seen. My portfolio: 40% Treasuries, 25% gold, 20% cash, 15% short credit.`,
      ],
      'bear': [
        `${shortEvent} confirms my thesis. The cracks are widening and they're becoming impossible to ignore if you know where to look. Corporate debt rollovers are going to be ugly at these rates — $2.5 trillion in investment grade bonds mature in the next 18 months, and they'll be refinanced at rates 200-300bps higher. That's a direct hit to earnings. Small and mid-cap companies with floating rate debt are already feeling the squeeze — look at the interest coverage ratios deteriorating across the Russell 2000. I'm adding to my short book with conviction: short high yield credit, short regional banks, long put spreads on IWM.`,
        `This is textbook late-cycle behavior. ${shortEvent} is the kind of catalyst that triggers a cascade in overleveraged markets. The Minsky moment is approaching — we've gone from hedge finance to speculative finance, and some pockets of the market are clearly in Ponzi finance territory. The VIX at 14 is a joke when you look at actual realized risks. Bank loan loss provisions are rising for the fourth straight quarter. Commercial real estate vacancy rates are at 20% in major cities. I'm increasing bear exposure across the board — double my puts, add to gold, and I'm seriously looking at Treasury duration for the first time in a while.`,
      ],
      'strong-bear': [
        `I've been warning about this for months and ${shortEvent} is the beginning of a systemic unwind. Let me lay it out: Commercial real estate losses will total $500B minimum — banks are still pretending these assets are worth par. Credit card charge-offs are running at 4.2%, the highest since 2011. The federal deficit is $2 trillion annually, which means the Treasury has to issue $2T in bonds per year into a market where the marginal buyer has changed from the Fed and foreign CBs to price-sensitive hedge funds. That's a recipe for a buyers' strike. The complacency in this market is staggering — VIX at 14 with this backdrop is criminal mispricing. Maximum defensive positioning — long vol, long gold, short credit, short regional banks. This is the Big Short 2.0.`,
        `The market is sleepwalking into a crisis. ${shortEvent} just accelerated the timeline on what I've been modeling for 6 months. My framework assigns a 45% probability to a credit event in the next 12 months — that's up from 30% last quarter. The triggers: CRE maturity wall in Q2, consumer credit deterioration accelerating, the Treasury funding tsunami overwhelming demand, and geopolitical risks that nobody is hedged for. When this breaks, it'll be 2008-level dislocation because the system is more leveraged, more interconnected, and more fragile than it was then. The Fed's balance sheet is already at $8T — they have less ammunition. Protect your capital NOW: 50% Treasuries, 30% gold, 20% tail hedges.`,
      ],
    },
    'quant-algo': {
      'strong-bull': [
        `Models are flashing green across all timeframes and I want to be very specific about what I'm seeing. ${shortEvent} triggered a momentum breakout signal with a 94% historical win rate over a 47-year backtest period. The factor decomposition shows: momentum z-score at +2.1 (99th percentile), breadth thrust confirmed with 87% of S&P 500 components above their 50-day MA, and the advance-decline line just hit a new all-time high. My volatility regime classifier has moved from "uncertain" to "low vol trending" — this regime historically produces 18% annualized returns with a Sharpe of 1.4. The systematic evidence is overwhelmingly bullish. Sizing up to maximum risk allocation with strict 2% trailing stops.`,
      ],
      'bull': [
        `Signals are net positive post ${shortEvent}. Let me walk through the factor stack: momentum z-score is +1.8 (82nd percentile), breadth is improving with the McClellan oscillator at +45, and the put/call ratio at 0.68 suggests healthy sentiment without euphoria. Cross-sectional momentum favors large-cap growth by 1.2 standard deviations. My mean reversion model gives only a 12% probability of a pullback exceeding 5% in the next 30 days. The model says buy with 73% conviction. I buy. Emotion is noise; data is signal. Position sizing: 80% of max risk budget, with dynamic stops at the 20-day low.`,
        `Running the numbers on ${shortEvent}: mean reversion probability is low at 18%, trend continuation probability is 73%, and the Hurst exponent just crossed above 0.6 indicating persistent trending behavior. My machine learning ensemble — combining LSTM, gradient boosting, and random forest — gives a 68% probability of positive returns over the next 21 trading days. The risk-reward is asymmetric: expected gain of 3.2% vs expected loss of 1.4%, giving us a 2.3:1 payoff ratio. Going long with tight risk management — initial stop at 1.5 ATR, position size calibrated to 1.2% portfolio risk.`,
      ],
      'neutral': [
        `The models are genuinely split after ${shortEvent} and I have to respect that signal. Short-term momentum (5-20 day) says buy with a z-score of +0.8, but longer-term mean reversion (60-120 day) says sell with an RSI divergence. The VIX term structure is flat — contango at only 0.3 points — which means the market isn't pricing in any directionality. My regime classifier puts us at a 47% probability of "range-bound choppy" and 28% each for "trending up" or "trending down." When the model doesn't know, I don't pretend to know. Reducing gross exposure by 40% and tightening all stops to 1 ATR. I'll re-engage when the signals converge — historically that takes 3-7 trading days after a regime ambiguity signal.`,
        `Interesting regime. ${shortEvent} has created a divergence between our volatility model and momentum model that I've only seen 6 times in the last decade. In 3 of those instances, the market broke out to the upside; in 3, it broke down. That's a coin flip, and I don't bet on coin flips. The Kalman filter is cycling between states, the hidden Markov model assigns near-equal probability to all three regimes, and cross-asset correlation is unstable. Staying neutral with minimal gross exposure until signals converge. I'm running my intraday mean-reversion strategy at reduced size to harvest theta while we wait for clarity.`,
      ],
      'bear': [
        `Quantitative signals are deteriorating rapidly. ${shortEvent} broke key support on the systematic level — 200-day momentum turning negative for the first time in 14 months. Let me be specific: the breadth thrust indicator failed to confirm the recent high, only 38% of S&P components are above their 200-day MA (down from 72% three months ago), and the advance-decline line has diverged bearishly for 6 weeks. My factor model shows momentum reversal risk at the 90th percentile, and the "quality" factor is outperforming "beta" — that's a classic risk-off regime transition. Model says reduce exposure by 50% and shift from beta to quality. Adding 2% portfolio weight in SPX put spreads.`,
      ],
      'strong-bear': [
        `Multiple model convergence on a sell signal — this is exceptionally rare and has happened only 4 times in my 20-year backtest. ${shortEvent} triggered a volatility regime shift from "low vol trending" to "high vol mean-reverting" — this transition has preceded every major drawdown since 2000. The numbers: momentum z-score at -2.3 (1st percentile), breadth at 28% (below the critical 30% threshold), VIX term structure inverted, and the credit-equity divergence model flashing its first warning since March 2020. Historical analog: Q4 2018, which saw a 20% peak-to-trough drawdown. Going max underweight equities with vol hedges — 30% VIX call spreads, 30% long Treasuries, 40% cash. Re-entry signal will come from the breadth thrust indicator, which historically gives 5-10 days of warning.`,
      ],
    },
    'crypto-max': {
      'strong-bull': [
        `LFG! ${shortEvent} is the catalyst crypto has been waiting for and the on-chain data is absolutely screaming accumulation. Let me give you the receipts: exchange reserves just hit a 5-year low at 2.1M BTC, meaning coins are moving to cold storage for long-term holding. Whale wallets (1000+ BTC) have added 120,000 BTC in the last 30 days. Spot ETF inflows are averaging $800M per day. The MVRV z-score is at 2.3 — still well below the 7+ level that historically marks cycle tops. The hash rate just hit an all-time high, confirming miner confidence. And the stock-to-flow model, for all its critics, is tracking perfectly for a move to $150K by year-end. BTC to new ATH is not just possible, it's inevitable. I'm 90% allocated with leverage.`,
      ],
      'bull': [
        `${shortEvent} is net positive for digital assets across the board. Institutional flows are accelerating at a pace we've never seen — the spot ETFs now hold $65B in AUM, making BTC the fastest-growing ETF category in history. On-chain metrics confirm: active addresses up 15%, transaction volume up 40%, and stablecoin supply expanding to $180B (a clear sign of capital waiting on the sidelines to deploy). The macro backdrop supports risk-on, and crypto is the highest-beta play in the market. DeFi TVL is recovering nicely at $90B, real yield farms are offering 8-12%, and the Ethereum ETF narrative gives us another catalyst ahead. Maintaining heavy long exposure: 50% BTC, 25% ETH, 15% SOL, 10% in high-conviction alts.`,
        `Bullish setup across the crypto complex. ${shortEvent} improves the liquidity environment for risk assets, and crypto captures that beta with a multiplier. DeFi TVL is recovering from the bear market lows, stablecoin supply is expanding (USDT and USDC combined back above $150B), and the funding rates on perpetual futures are positive but not overheated — sitting at 8-12% annualized, which is healthy. The Ethereum ecosystem is thriving with L2s processing 4x more transactions than L1. I'm particularly excited about the RWA tokenization narrative — BlackRock's BUIDL fund just crossed $500M. This cycle isn't over; we're in the mid-innings. Maintaining my core positions and adding selectively on dips.`,
      ],
      'neutral': [
        `${shortEvent} is a mixed bag for crypto and I'm being disciplined about not over-trading here. Bitcoin's 30-day correlation to the Nasdaq is still at 0.65 — too high for me to ignore macro risk. On-chain metrics are mixed: long-term holders are accumulating, but short-term holder supply is elevated, suggesting distribution near the top. The funding rate on Binance perpetuals just flipped negative briefly, which tells me there's uncertainty in the derivatives market. I'm watching the $60K level for BTC — need a clean weekly close above it with volume confirmation to get fully convicted. Until then, I'm 60% allocated with tight stops. No leverage, no altcoin bets, no hero trades.`,
      ],
      'bear': [
        `Not great for crypto near-term. ${shortEvent} could tighten liquidity conditions, and make no mistake — crypto needs liquidity like a fish needs water. When global M2 contracts, crypto underperforms everything. The on-chain data is starting to worry me: miner outflows are elevated, exchange inflows are ticking up, and the futures open interest relative to market cap is at levels that preceded the May 2021 crash. The DeFi sector is showing stress with several lending protocols seeing rising bad debt. I'm reducing altcoin exposure by 50%, closing all leveraged positions, and keeping only my BTC and ETH core. Even the crypto bull in me knows when to play defense. Capital preservation is the priority — there will always be another entry point.`,
      ],
      'strong-bear': [
        `${shortEvent} is going to crush risk appetite and crypto gets hit first in a flight to safety — that's not my opinion, it's what happens every single time. Look at March 2020, May 2021, November 2022 — crypto leads the risk-off trade by days. I hate saying this because I'm a long-term crypto believer, but the short-term setup is ugly: leveraged long positions are at record levels, funding rates were positive for 45 straight days before just flipping, and the BTC futures basis has collapsed from 15% to 3%. Whales are distributing — the top 100 wallets have reduced exposure by 8% this month. I'm moving 70% to stables, keeping 20% in BTC as my core conviction position, and using 10% for tactical short hedges via puts. This isn't capitulation, it's discipline — I'll be back in heavy when the leverage flushes out.`,
      ],
    },
    'tech-growth': {
      'strong-bull': [
        `${shortEvent} is incredibly bullish for the tech secular growth story and I cannot stress this enough — the AI capex cycle is JUST getting started. Look at the numbers: NVDA revenue grew 200% YoY, cloud revenue for the hyperscalers reaccelerated to 30%+, and enterprise AI adoption is still in the first inning — only 5% of enterprises have deployed AI at scale. This is the 1995 internet moment, not 1999. The difference? These companies — NVDA, MSFT, GOOGL, META — are actually generating massive free cash flow. NVDA alone printed $15B in FCF last quarter. The AI infrastructure buildout is a $1 trillion total addressable market through 2030, and the picks-and-shovels plays (semis, cloud infra, networking) will capture the lion's share. I'm loading up: 25% NVDA, 15% MSFT, 15% GOOGL, 10% AVGO, with the rest in second-derivative plays like MRVL and ANET.`,
      ],
      'bull': [
        `Good setup for growth here. ${shortEvent} supports the multiple expansion thesis for high-quality tech, and the fundamental story keeps improving. Cloud revenue acceleration is real — AWS at 17%, Azure at 29%, GCP at 28% — and AI is adding incremental revenue on top. Microsoft Copilot is driving a 40% uplift in Office 365 ARPU for enterprise customers. Semiconductor demand is so strong that TSMC is adding 3nm capacity faster than planned. The software layer is catching up too — ServiceNow, CRM, and PLTR are all showing AI-driven revenue beats. I'm overweight the entire tech value chain: semis for the infrastructure buildout, cloud for the platform play, and select software for the application layer. Quality growth at reasonable prices — NVDA at 30x forward earnings growing 100%+ is still cheap.`,
        `${shortEvent} keeps the innovation premium intact and I'm leaning into it. Semis are leading — the SOX index just broke to new highs — and software is catching up as enterprises move from POC to production deployments. The AI infrastructure buildout alone justifies current valuations for the mega-caps: MSFT, GOOGL, AMZN, and META are spending $200B combined on capex this year, but they're funding it from $500B in combined cash. That's not speculative, that's strategic reinvestment by the strongest balance sheets on the planet. Meanwhile, the second-order effects are just starting — edge AI, autonomous systems, drug discovery, code generation — each of these is a $100B+ market forming in real time. Maintaining my 40% portfolio allocation to tech with a barbell of proven mega-caps and high-growth mid-caps.`,
      ],
      'neutral': [
        `${shortEvent} is noise for long-term tech investors, and I try to separate signal from noise. The secular trends — AI infrastructure buildout, cloud migration, digital transformation, cybersecurity — are unchanged and will drive earnings growth for the next 5-10 years. But near-term, I have to acknowledge that valuations need a breather. The Nasdaq-100 is trading at 28x forward earnings, which is the 85th percentile historically. That doesn't mean we crash, but it limits upside potential and increases sensitivity to negative surprises. I'm maintaining my positions but not adding — using this period to rebalance from crowded AI names into underappreciated plays in cybersecurity (CRWD, PANW) and vertical SaaS. If we get a 10% pullback, I'm deploying aggressively.`,
      ],
      'bear': [
        `${shortEvent} is a headwind for growth multiples and the math is starting to matter. If the 10-year yield stays above 4.5%, the equity duration risk in tech gets painful — a 100bps move in rates translates to roughly a 15% de-rating for high-multiple names. The AI spending is real, but the monetization timeline is getting stretched. How many $20B GPU orders can MSFT and GOOGL place before investors ask "where's the revenue?" We saw this playbook with 3G, 5G, and the metaverse — massive capex followed by disappointment. I'm not saying AI is a bust, but I am saying the stocks are priced for perfection. Rotating from expensive AI names (NVDA at 30x, ARM at 80x) to defensive tech with cash flow — ORCL, IBM, CSCO. Reducing my overall tech weight from 35% to 25%.`,
      ],
      'strong-bear': [
        `The AI bubble is meeting cold, hard reality. ${shortEvent} exposes the over-investment thesis that I've been warning about for months. The hyperscalers are spending $200B on GPU infrastructure with unclear ROI — Microsoft's own internal estimates show Copilot adoption at only 15% of target. Google's AI search cannibalizes ad revenue. Meta is burning $15B annually on Reality Labs with nothing to show for it. Every capex-driven boom in tech history has ended the same way: overcapacity, margin compression, and a vicious drawdown. The dot-com bubble saw $7T in market cap evaporate. I'm not saying it'll be that bad, but a 30-40% correction in AI-adjacent names is my base case. Exiting all pure-play AI positions and rotating to cash-rich, low-multiple tech names. Sometimes the best trade is the one you don't make.`,
      ],
    },
    'value-hunter': {
      'strong-bull': [
        `Hard to find deep value when everything's rallying, but ${shortEvent} creates a rotation opportunity that value investors should embrace. While the growth crowd piles into AI names at 40x earnings, I'm finding gems hiding in plain sight. Financials are trading at 10x forward earnings with book values at 1.1x — historically that's been a 15% annual return setup. Industrials like Caterpillar and Deere are trading at normalized P/Es of 14x despite 20% earnings growth. Energy majors are generating 10% free cash flow yields and returning capital aggressively. The value-growth spread is at the 90th percentile historically, which means value outperforms by 6% annually over the following 3 years. Patient money wins — it always has, it always will.`,
      ],
      'bull': [
        `${shortEvent} supports the economic recovery thesis, which is directly bullish for value names that the market has left behind. Banks are seeing loan growth reaccelerate, energy companies are printing cash at $80 oil, and old-economy stocks in industrials and materials are trading well below intrinsic value on my DCF models. My bottom-up screen shows 45 S&P 500 companies trading below 12x forward P/E with positive earnings revisions — the most since early 2023. The Shiller P/E for the cheapest quintile of the market is 11x vs 35x for the most expensive. History is unambiguous about which group outperforms over 5-year periods. Deploying capital into Berkshire at 1.3x book, JPM at 11x earnings, and select energy majors yielding 4%+.`,
      ],
      'neutral': [
        `${shortEvent} doesn't change the fundamental valuation picture, and I refuse to be swayed by macro noise when my job is bottom-up stock picking. The S&P 500 aggregate forward P/E of 22x is stretched by any historical standard — the 30-year average is 16.5x. Strip out the Magnificent 7 and the equal-weight S&P trades at a more reasonable 15x, but even that's above average. I'm maintaining a balanced book with strict discipline: only buying businesses trading below my estimate of intrinsic value with a 25% margin of safety. Focus is on free cash flow yield above 6%, return on invested capital above 15%, and manageable leverage below 2x net debt/EBITDA. Found 12 names that meet all criteria — that's my portfolio. No macro bets, no sector tilts, just disciplined value.`,
        `The market's reaction to ${shortEvent} seems overblown either way, and that's typical. Mr. Market is manic-depressive; my job is to be rational. I'm focused on bottom-up stock picking — finding businesses trading below replacement cost with strong balance sheets and durable competitive advantages. Currently own 18 positions with an average P/E of 11x, average FCF yield of 7.3%, and average dividend yield of 3.1%. The portfolio has a weighted average return on equity of 16%, which tells me I'm not buying value traps — I'm buying quality businesses on sale. The AI frenzy has created an extraordinary opportunity for patient capital as the market ignores everything that doesn't have "AI" in the investor presentation.`,
      ],
      'bear': [
        `${shortEvent} is starting to impact earnings estimates, and this is where value investing gets really important. When growth slows, the expensive stuff gets hit first — names trading at 40x+ have the most room to de-rate. I'm rotating into high-quality defensive value — healthcare names like JNJ and UNH trading at 15x with recession-proof revenue, consumer staples like PG and KO at reasonable multiples with pricing power, and utilities that now yield 4.5% with regulated earnings growth. My portfolio's weighted average P/E is 12x with a 4.2% dividend yield — that's the kind of setup that outperforms in every downturn since 1970. When everyone else is panicking, I'll be collecting dividends and waiting for better prices to add risk.`,
      ],
      'strong-bear': [
        `This is when value investing shines brightest, and I say that with 30 years of experience. ${shortEvent} is creating a margin of safety in quality businesses that hasn't existed since 2020. My shopping list is getting longer every week: world-class franchises trading at 8-10x earnings, dividend aristocrats yielding 5%+, and asset-heavy businesses trading below liquidation value. When the panic selling starts in earnest — and it will — that's when I deploy the 25% cash position I've been building for exactly this moment. Warren Buffett has $180B in cash for a reason. Graham and Dodd's principles haven't changed in 90 years: buy when there's blood in the streets, sell when there's euphoria. Cash is king until the forced selling creates genuinely asymmetric risk-reward.`,
      ],
    },
    'fed-watcher': {
      'strong-bull': [
        `${shortEvent} significantly changes the Fed calculus and I want to be very precise about what this means for markets. The Fed's dual mandate — maximum employment and price stability — is now pulling in the same direction: inflation at 2.4% core PCE is within spitting distance of the 2% target, and the labor market is cooling gently enough that the Fed can declare mission accomplished. I expect a dovish pivot at the next FOMC meeting — not just in the statement language, but in the dot plot, which should show 4-5 cuts in 2025 vs the current 2-3. CME FedWatch is pricing 78% probability of a cut — I think that's if anything too low. This is extremely bullish for duration and equities: long TLT for 12%+ total return, long rate-sensitive sectors like REITs, utilities, and homebuilders. The era of "higher for longer" is ending.`,
      ],
      'bull': [
        `${shortEvent} gives the Fed room to be accommodative and the fixed income market is starting to price this in. The 2-year yield has dropped 35bps in the last month, the yield curve is steepening, and real yields are coming down from restrictive levels. The next dot plot should show a more dovish path — I'm expecting the median 2025 rate to drop from 4.6% to 4.1%. This is bullish for rate-sensitive sectors across the board: REITs have 25% upside if rates normalize, utilities get multiple expansion, and the 60/40 portfolio starts working again with bonds providing both income and diversification. I'm extending duration to 7-8 years, adding IG corporate bonds at 120bps spread, and overweighting real estate and utilities. The fed funds rate at 5.25% is overtly restrictive given current inflation — they WILL cut.`,
      ],
      'neutral': [
        `${shortEvent} keeps the Fed in data-dependent mode, which is exactly where Powell wants to be. Reading between the lines of his last presser plus the latest data: they're comfortable at 5.25-5.50% and see no urgency to move in either direction. The incoming data is mixed enough to justify patience — core services ex-housing inflation is still sticky at 4.1%, but goods deflation is helping the headline number. My baseline forecast hasn't changed: first cut comes next quarter, and the terminal rate for this cycle is 3.5-4.0%. That's 125-175bps of cuts, mostly in 2025. Markets should stay range-bound in this environment — the 10-year between 4.0-4.5% and the S&P within 5% of current levels. I'm neutral on duration, slightly overweight IG credit for the carry, and patient.`,
        `Reading the Fed tea leaves after ${shortEvent}: they're trying to engineer a soft landing and the data is cooperating — barely. The unemployment rate at 4.1% is above the 3.4% trough but well within the Fed's comfort zone. Core PCE at 2.4% is close to target but not there yet. The Fed will want to see 3 consecutive prints at or below 2.2% before cutting. That puts us on a timeline of Q2 for the first cut. Neither hiking nor cutting soon — the yield curve tells the real story: flat with a slight positive slope, indicating the market expects gradual easing starting mid-year. I'm positioning for this glide path: slight overweight in intermediate duration, neutral on credit, and avoiding rate-sensitivity extremes.`,
      ],
      'bear': [
        `${shortEvent} could force the Fed's hand in the wrong direction, and the market is completely unprepared for this scenario. If this is inflationary — and there are real reasons to think it could be, including supply chain disruptions, fiscal expansion, and energy price pass-through — then higher-for-longer becomes the base case for 2025. The market is pricing 4 cuts this year; if we get zero, that's a massive repricing event. The 2-year yield would need to move 80bps higher, and equities would face a 10-15% headwind from multiple compression alone. I'm positioned for this risk: short duration (2-year target), overweight TIPS at +150bps real yield, underweight rate-sensitive sectors, and holding a barbell of T-bills and very short credit. The bond market doesn't lie, and the term premium is telling us something.`,
      ],
      'strong-bear': [
        `Worst-case Fed scenario is unfolding in real time. ${shortEvent} means they may have to tighten further — yes, FURTHER — and the market is priced for the exact opposite. Let me spell it out: core services inflation is reaccelerating, the Atlanta Fed wage tracker is sticky at 5.2%, and the latest employment cost index showed unit labor costs rising 4.8%. The Fed's own models suggest they need rates at 6%+ to bring inflation back to 2% sustainably. That's another 75-100bps of hikes that NOBODY is pricing. The 2-year yield at 4.7% tells you the bond market is starting to figure this out. If we get a hot CPI print next month, the repricing will be violent — I'm talking 2022-style bond losses. Maximum caution: 100% short-duration Treasuries and T-bills, zero credit risk, zero equity duration. The time to take risk will come, but it is emphatically not now.`,
      ],
    },
    'geopolitical': {
      'strong-bull': [
        `Rare good news on the geopolitical front, and I don't say that lightly. ${shortEvent} actually reduces the global risk premium in a meaningful way. If tensions continue to de-escalate — and there are genuine reasons for cautious optimism here, including back-channel diplomacy progress and reduced rhetoric from key actors — there's significant upside in assets that carry a geopolitical discount. EM equities are 30% cheaper than DM on a P/E basis, and half of that discount is geopolitical risk premium. Commodity producers would benefit from reduced supply disruption fears. The defense sector, ironically, could underperform as the urgency premium fades. I'm tactically reducing my geopolitical hedges by 40% and reallocating to EM equities and commodity producers. But I'm keeping 60% of my hedges because geopolitics is non-linear — things can re-escalate faster than they de-escalated.`,
      ],
      'bull': [
        `${shortEvent} is modestly positive from a geopolitical risk perspective, but I want to be measured in my optimism. The underlying structural tensions — US-China tech decoupling, Middle East instability, Russia-NATO confrontation, and the reshoring/friendshoring trend — haven't disappeared. Supply chains are adapting, which is positive, but adaptation takes years and costs money. I'm keeping my defense and energy overweights as insurance, but I'm incrementally adding to EM and commodity exposure. My geopolitical risk model moved from "elevated" to "moderate" — that's progress, but we're still above the historical baseline. Think of it like insurance: the premium went down, but you still need the coverage.`,
      ],
      'neutral': [
        `${shortEvent} doesn't change the underlying geopolitical landscape, and the landscape is concerning. Let me run through my three-theater risk assessment: In Asia, the Taiwan Strait situation remains a structural risk with 15% annual probability of military escalation in my model. In the Middle East, the Houthi disruption of Red Sea shipping has rerouted 20% of global trade around the Cape of Good Hope, adding $1M per container ship per voyage. In Europe, the Ukraine conflict has become a frozen war of attrition with no off-ramp visible. The US-China tech war continues to fragment the semiconductor supply chain. These risks are persistent, not transient. My portfolio hedges: 10% gold, 5% defense ETFs, 5% energy as supply disruption insurance, and reduced EM exposure focused on "safe" EMs like India and Mexico that benefit from friend-shoring.`,
      ],
      'bear': [
        `${shortEvent} adds fuel to existing geopolitical tensions that the market is systematically underpricing. I've been tracking escalation risks across three theaters, and the composite risk index just hit 72/100 — the highest since February 2022. Let me be specific: satellite imagery shows increased military activity in the Taiwan Strait, the Middle East conflict is widening with state actors becoming more directly involved, and NATO defense spending increases suggest a long-term shift to a war economy posture. Energy supply disruption probability has moved from 12% to 25% in my model. Oil at $85 doesn't reflect the risk of a supply shock that could send it to $130 overnight. I'm overweight defense (LMT, RTX, GD), energy (XLE), and gold. Also holding 5% in VIX calls as tail risk insurance. The geopolitical risk premium is way too low — the market is treating 2024 like it's 2015, and it's not.`,
        `The geopolitical risk premium is way too low and ${shortEvent} is exactly the kind of catalyst that can escalate quickly. I've modeled 15 geopolitical scenarios over the last 6 months, and in 9 of them, the outcome is worse for risk assets than what's currently priced. Markets always underestimate tail risks until it's too late — that's behavioral finance 101. The VIX at 14 with this geopolitical backdrop is the equivalent of sunbathing during hurricane season. One miscalculation in the South China Sea, one escalation in the Middle East, one accident in the Black Sea — and you get a 5-10% overnight gap down. I'd rather pay the insurance premium and be wrong than be unhedged and right about one of these scenarios.`,
      ],
      'strong-bear': [
        `DEFCON 2 for markets and I'm not being hyperbolic. ${shortEvent} combined with the pre-existing tensions across three theaters creates a multi-front risk scenario that I haven't seen since the Cold War. My military intelligence contacts — and yes, I have them — are more concerned than at any point since 2022. The global defense spending trajectory is war-economy-level: NATO at 2.5%+ of GDP, Japan doubling its defense budget, Taiwan accelerating its asymmetric defense strategy. These aren't peacetime allocations. Supply chain resilience is being tested daily — semiconductor lead times are extending again, rare earth export restrictions are tightening, and shipping insurance rates through the Red Sea have tripled. Long gold (15% allocation), long oil (10%), long defense stocks (10%), long VIX calls (5%), and the rest in short-duration Treasuries. The world is more dangerous than the VIX implies by a factor of 3. Protect first, profit second.`,
      ],
    },
    'retail-pulse': {
      'strong-bull': [
        `WSB is going absolutely nuclear on this and the numbers back it up. ${shortEvent} has retail options flow at a 6-month high — call volume at 28M contracts yesterday, put/call ratio collapsed to 0.52, and the single-stock options premium spent hit $4.8B in a single day. Social sentiment trackers show bullish post volume up 340% on Reddit, Fintwit engagement metrics are through the roof, and the "fear of missing out" index I track is at 92/100. But here's the thing — when retail gets this excited AND the institutional flow confirms (dark pool prints are net positive), the squeeze potential is massive. The gamma squeeze setup in NVDA, TSLA, and AMC weeklies is textbook. I'm riding the momentum with strict position limits: 5% max per name, weekly options only, and I'm out at the first sign of negative gamma flip.`,
      ],
      'bull': [
        `Social sentiment turning very positive post ${shortEvent} and the breadth of retail participation is healthy, not manic. Reddit thread analysis shows informed bullish discussion, not mindless hype — people are citing fundamentals, not just rocket emojis. Twitter/X Crypto Twitter is excited but measured. The key signal for me is options flow: heavy call buying in weeklies across tech names with open interest building at the right strikes. The AAII sentiment survey shifted from 30% bull to 45% bull — that's constructive without being contrarian bearish. Put/call ratio at 0.68 is positioned for upside. I'm riding the momentum with quality names: long NVDA calls, long TSLA spreads, and participating in the broader risk-on trade via QQQ. Retail often gets the direction right in trending markets — the mistake is always in sizing and timing the exit.`,
      ],
      'neutral': [
        `Retail is genuinely confused by ${shortEvent}, and I'm reading that as a neutral signal. The data tells the story: Reddit sentiment is 50/50 bull-bear for the first time in months, the AAII survey shows record "neutral" readings, and the put/call ratio at 1.0 is perfectly balanced. When the crowd doesn't have conviction, it usually means we're at an inflection point — the question is which way. I'm monitoring three things for direction: 1) whether retail call buying re-emerges (bullish), 2) whether put volume spikes (bearish), and 3) whether engagement drops (suggests the move is over). Until one of these breaks, I'm sitting on hands with minimal exposure. No hero trades in directionless markets — I've learned that lesson the hard way.`,
      ],
      'bear': [
        `Retail is starting to capitulate and the data is uncomfortable. ${shortEvent} triggered a surge in put buying — put/call ratio spiked to 1.35, which is the 90th percentile reading. "I'm out" and "I'm done" posts on Reddit are trending. Margin calls are hitting the newer traders who levered up during the rally — broker margin debt fell $18B last month. The AAII bear reading jumped to 48%, historically a contrarian buy signal, but here's the nuance: retail capitulation is a PROCESS, not an EVENT. The wash-out isn't complete until we see fund outflow data from ICI showing 3+ consecutive weeks of equity outflows. We're on week 1. So while contrarian indicators say we're getting close to a bottom, I don't think we're there yet. Staying cautious, watching for the full flush.`,
      ],
      'strong-bear': [
        `Full retail panic mode and the sentiment data is as bearish as I've ever seen it. ${shortEvent} has wiped out a generation of "buy the dip" traders who learned their craft in 2020-2021 and have never experienced a real bear market. The numbers: AAII bears at 55% (99th percentile), Reddit WSB daily active users down 40% from peak (the tourists are leaving), Robinhood daily average revenue trades down 35%, and margin calls are forcing liquidation of meme stock portfolios. Historically, this level of retail pain IS a contrarian buy signal — the question is timing. The capitulation isn't complete until I see: 1) equity fund outflows for 4+ weeks, 2) VIX spike above 35, and 3) the put/call ratio sustaining above 1.2 for a week. We're at 2 out of 3. Getting close to a massive buying opportunity, but discipline says wait for the full flush before deploying.`,
      ],
    },
    'income-yield': {
      'strong-bull': [
        `${shortEvent} creates an excellent entry for income investors and the math has never been more compelling. Dividend yields are expanding as prices dip — I'm finding 30-year dividend aristocrats yielding 4.5%+ with payout ratios below 60%, which gives massive room for dividend growth. The yield on the S&P 500 dividend aristocrat index is at 2.8%, which doesn't sound exciting until you factor in the 10% annual dividend growth rate — that's a 5.5% yield on cost in 5 years and 9% in 10 years. Meanwhile, IG corporate bonds are yielding 5.5% with minimal default risk. The total income available to a conservative portfolio — combining dividends, bond coupons, and preferred shares — is the highest since 2007. Loading up on dividend aristocrats, adding IG corporates, and building a 5.2% blended yield portfolio that grows 8-10% annually.`,
      ],
      'bull': [
        `${shortEvent} supports the income trade and the fundamental backdrop for dividend payers is strong. Corporate cash flows are healthy enough to maintain and grow dividends — S&P 500 companies are generating $2.2 trillion in annual free cash flow, up 15% from last year. The 4%+ yield on quality names like JNJ, PG, and PEP is very attractive relative to history. I'm particularly interested in energy MLPs yielding 7-8% with 1.5x coverage ratios, and closed-end bond funds trading at 8-10% discounts to NAV with 6%+ distribution rates. The total return proposition for income investors — 4-5% yield + 3-5% dividend growth + potential capital appreciation — gives you a realistic 10-12% total return with half the volatility of the broad market. Building positions systematically.`,
      ],
      'neutral': [
        `${shortEvent} is neutral for the income strategy, and I'm focused on the fundamentals rather than macro noise. My north star metrics: dividend sustainability (payout ratios below 65%), free cash flow coverage (2x+ for every holding), and balance sheet quality (investment grade credit ratings only). Across my 35-stock dividend portfolio, the average payout ratio is 48% with 2.3x FCF coverage — that's fortress-level sustainability. The portfolio yields 4.1% with a 10-year dividend growth CAGR of 8.2%. No changes to make here — this strategy works in bull markets, bear markets, and everything in between. Time in the market beats timing the market, especially when you're collecting 4% annually just for showing up.`,
      ],
      'bear': [
        `Concerned about dividend sustainability after ${shortEvent} and I'm doing the work company by company. Some sectors — consumer discretionary, REITs with high leverage, small-cap financials — may face earnings pressure that threatens payouts. I've identified 6 holdings where the payout ratio has crept above 80% or where FCF coverage has fallen below 1.5x. Those are getting sold and replaced with higher-quality names. Moving up in quality across the board: dropping lower-rated high yield bonds (BB and below) for investment grade, replacing aggressive dividend payers with aristocrats, and adding Treasury allocation for ballast. My yield drops from 4.5% to 3.8%, but my sleep-at-night factor goes up dramatically. In uncertain environments, the first priority is protecting the income stream, not maximizing it.`,
      ],
      'strong-bear': [
        `${shortEvent} puts dividend cuts squarely on the table for weaker names, and I've seen this movie before — 2008-2009, 2020. The companies that cut are always the ones that were paying out more than they could afford, leveraged beyond prudent levels, and operating in cyclically exposed industries. I'm stress-testing every holding: what happens if revenue drops 15%? Can they still cover the dividend? 8 of my 35 positions fail that stress test — they're gone. I'm moving to a crisis-proof income portfolio: 40% in short-duration Treasuries yielding 5.2% (yes, you can get 5.2% risk-free), 30% in investment grade corporates at 5.5%, 20% in dividend aristocrats that maintained or grew dividends through 2008-2009, and 10% in preferred shares from fortress-balance-sheet banks. Capital preservation first, yield second. This too shall pass, and when it does, I'll redeploy into high-quality dividend growers at much better prices.`,
      ],
    },
    'emerging-mkts': {
      'strong-bull': [
        `${shortEvent} is a massive catalyst for EM and this is the setup I've been waiting 18 months for! Dollar weakness is the single most important variable for EM, and the DXY just broke below 100 — every 1% decline in the dollar has historically correlated with 2.5% outperformance for EM equities. The valuation gap is at extremes: MSCI EM trades at 10.5x forward P/E vs 22x for the S&P 500. India GDP is growing 7.5% with a booming middle class of 400 million consumers. Indonesia is the quiet star at 5.1% growth with improving current account dynamics. Brazil is cutting rates with inflation under control. Even China is showing signs of life — the PMI just crossed 50 and the government stimulus is finally getting traction in the data. I'm going heavy: 25% India, 15% Indonesia, 10% Brazil, 10% Mexico, and letting the trade ride with a 6-month horizon.`,
      ],
      'bull': [
        `Positive for emerging markets across the board. ${shortEvent} should support capital flows into EM equities and bonds, and the flow data is already confirming: $3.2B in EM equity inflows last week, the most since January. The India growth story is intact — it's a structural 7%+ growth economy with demographics that look like the US in the 1950s. China PMI showing green shoots at 50.3, and the property sector stabilization measures are gaining traction. But the real alpha in EM right now is in the "Next-11" countries: Vietnam (manufacturing reshoring beneficiary), Philippines (BPO + remittances), and Mexico (nearshoring boom). The EM-DM growth differential at 3.5 percentage points is the highest since 2015 — that always drives capital flows. Adding selectively with a focus on domestic demand stories rather than commodity plays.`,
      ],
      'neutral': [
        `${shortEvent} is a mixed signal for EM and the king variable — the US dollar — hasn't resolved. Until the DXY breaks decisively below 100 or above 108, EM stays rangebound, and I'm fine with that. The structural thesis is intact: EM demographics are superior, valuations are cheap, and the growth differential vs DM is positive. But the tactical setup is unclear because the Fed hasn't committed to cutting, China's recovery is uncertain, and geopolitical risks (Taiwan, Middle East) disproportionately affect EM. I'm maintaining my core EM allocation at 15% of the portfolio but being very selective: overweight India (structural growth) and Mexico (nearshoring), underweight China (policy uncertainty) and commodity-heavy EMs (Brazil, South Africa). Waiting for the dollar to tell me the next move.`,
      ],
      'bear': [
        `${shortEvent} is a headwind for EM and the trifecta of pain is forming: rising dollar (DXY above 104), tighter global liquidity (G4 central banks still in QT mode), and commodity price weakness outside of oil. This is the classic EM bear setup, and it's playing out textbook. Capital outflows from EM have been $8B in the last month. Currencies are weakening — the Turkish lira, Argentine peso, and South African rand are all under pressure. The carry trade is getting crowded and any unwind would be disorderly. I'm reducing EM exposure by 40%, focusing on the most vulnerable: Turkey (current account deficit + inflation), Argentina (fiscal crisis), and frontier Africa (debt sustainability). Keeping only India and Mexico as structural positions with full currency hedges. EM can be a value trap in a strong dollar environment — ask anyone who held in 2013 or 2018.`,
      ],
      'strong-bear': [
        `EM crisis risk is genuinely elevated and I've seen this pattern before — it doesn't end well. ${shortEvent} plus dollar strength plus commodity weakness plus rising US rates is the toxic trifecta that preceded every major EM crisis: 1997, 2013 taper tantrum, 2018 Turkey/Argentina, 2020 COVID. The difference now is that EM corporate debt is 50% higher than in 2018, dollar-denominated EM bonds face a $200B maturity wall in the next 12 months, and the IMF lending capacity is already stretched from prior interventions. History is unambiguous: get out of EM before the contagion starts, because once it does, correlations go to 1 and there's no hiding. I'm exiting all EM positions except India (too large to ignore structurally), hedging remaining exposure with USD/EM currency baskets, and will look to re-enter when the DXY peaks and the Fed actually starts cutting — which could be 6-12 months away.`,
      ],
    },
    'volatility-arb': {
      'strong-bull': [
        `Vol crush incoming and the setup is gorgeous for premium sellers. ${shortEvent} is going to compress implied volatility across the board as realized vol drops and the VIX mean-reverts from 18 back to its natural resting state around 12-13. The term structure is in steep contango (VIX/VIX3M at 0.82), the SKEW index has normalized to 125 (from 145 peak), and the put/call ratio is falling — all classic vol compression signals. I'm selling puts across the quality spectrum: 30-delta SPX puts at 45 DTE, ATM straddles on mega-cap tech at 21 DTE, and building a systematic short volatility portfolio targeting 15% annualized return with a max drawdown of 8%. The options market is over-hedged by about 3 volatility points — there's free money to harvest for anyone disciplined enough to manage the tail risk. VIX heading to sub-12 within 30 days.`,
      ],
      'bull': [
        `${shortEvent} skews the risk to the upside and the volatility surface confirms it. IV is elevated by about 2 points relative to where it should be given the macro setup — that's excess premium for sellers to harvest. The 25-delta put skew at -3.2 is steep, meaning downside protection is expensive relative to fair value. I'm selling downside puts in quality names (AAPL, MSFT, GOOGL) at 15-20% OTM, collecting 1.2-1.5% premium per month. If we get assigned, we own great companies at better prices; if not, we pocket the premium. Also harvesting theta on calendar spreads where the term structure is steep. The vol surface is favorable for structured strategies — iron condors on SPX with 80% probability of profit at current IV levels. Managing risk with 2% portfolio stop-loss per position.`,
      ],
      'neutral': [
        `${shortEvent} has the options market genuinely confused and I love it — confusion creates opportunity for volatility traders. IV and RV are converging at 16, which means the market isn't sure whether we're going up or down. The term structure is flat (VIX futures 1-2 spread at 0.3 points), which eliminates the usual contango roll yield. But here's where it gets interesting: the cross-asset volatility dispersion is at a 2-year high — equity vol is flat while FX vol and rate vol are spiking. That means we can sell equity vol and buy rate vol, creating a dispersion trade that profits regardless of direction. I'm also running my intraday mean-reversion strategy at reduced size, selling iron condors with 80-85% POP, and keeping 30% of my book in cash for quick deployment when the regime resolves. Patience is a vol trader's superpower.`,
      ],
      'bear': [
        `${shortEvent} is going to spike realized vol and the market is completely unprepared. The implied vol surface is too flat at 15 — my model fair value is 22 based on the macro uncertainty, credit spreads, and correlation regime. I'm buying VIX calls at the 20 strike (200% return if VIX hits 28), SPX put spreads 5% OTM, and adding to my long gamma position via short-dated straddles. The key metric: the 30-day IV/RV ratio at 0.85 means implied vol is BELOW realized vol — that's extremely rare and has preceded every vol spike of 30%+ in the last decade. The VVIX (vol of VIX) is also depressed at 85, which means protection is cheap. When fear arrives, it reprices overnight — I've seen VIX go from 12 to 40 in 48 hours (Feb 2018, Mar 2020). Sizing appropriately: 5% of portfolio in outright long vol, 5% in tail hedges, rest in cash.`,
      ],
      'strong-bear': [
        `Vol explosion imminent and the mathematical setup is the most compelling I've seen since pre-COVID. ${shortEvent} is the catalyst and the market isn't hedged — fund managers' equity exposure is at the 95th percentile while VIX is at the 10th percentile. That mismatch has resolved violently every single time in the last 25 years. My vol regime model just flipped from "compressed" to "transitioning" — the next state is either "elevated" (VIX 25-35) or "crisis" (VIX 35+), and both are profitable for my current positioning. The trade: VIX call spreads (20/30 strikes at 60 DTE), SPX put ratios (short 1x 5% OTM, long 3x 10% OTM for a credit), and outright long 1-month strangles on SPY. Maximum potential return: 400% on the VIX calls if we get a true vol event. When fear arrives, it pays to be the one selling insurance at distressed premiums. Cash position at 40% — ready to deploy as a vol seller once VIX crosses 35.`,
      ],
    },
    'price-action': {
      'strong-bull': [
        `The chart is screaming breakout. ${shortEvent} just triggered a clean break above the 200-day moving average with volume confirmation — 2.5x average volume on the breakout bar, which is textbook institutional accumulation. The weekly candle is a massive bullish engulfing pattern swallowing the last 3 weeks of indecision. Key Fibonacci extension targets: 1.618 at the next resistance cluster. The ADX is at 35 and rising, confirming trend strength — anything above 25 with a rising +DI is a green light for trend-followers. Support/resistance structure is clean: higher highs, higher lows on the daily, weekly, and monthly timeframes. Volume profile shows a high-volume node acting as a launchpad. I don't care about the "why" — the chart says buy, and I'm buying with a stop below the breakout candle's low. Target is 15-20% above current levels based on the measured move from the consolidation range.`,
      ],
      'bull': [
        `Price action is constructive after ${shortEvent}. The daily chart shows a clean higher-low sequence with the 50-day MA crossing above the 200-day MA — a golden cross that has a 78% success rate in trending markets. Volume is confirming: up days are printing 1.5x the volume of down days, which is the hallmark of accumulation. The RSI is at 62, trending higher but not overbought — plenty of room to run before we hit 70+ extreme readings. Key level to watch: if we close above the prior swing high with conviction, the measured move projects another 8-12% of upside. The VWAP from the recent low is sloping upward and acting as dynamic support. I'm long with a stop below the most recent higher low — risk/reward is about 3:1 from here.`,
        `Reading the tape post ${shortEvent}: buyers are in control. The market structure is bullish — we're seeing accumulation patterns on the order flow, large block trades coming through on the bid, and the bid-ask spread is tightening (a sign of increasing liquidity). The candlestick pattern on the daily is a series of bullish closing marubozu candles — strong closes near the high of the day for 4 consecutive sessions. The Ichimoku cloud has flipped bullish with price above the cloud, the conversion line above the base line, and the lagging span confirming. This is a multi-timeframe buy signal. Entering long with initial targets at the next round number resistance, stop below the Kijun-sen.`,
      ],
      'neutral': [
        `The chart is at an inflection point after ${shortEvent} and I need to see resolution before committing. Price is sitting right at the 200-day moving average — the most-watched level in technical analysis — and volume is drying up, which means neither bulls nor bears have conviction. The daily chart shows a triangle/wedge formation that's been compressing for 3 weeks. The ADX is at 18 and falling, confirming no trend — this is a chop zone and you'll get chopped up trying to force a direction here. I'm watching for a decisive close above or below the triangle bounds with at least 1.5x average volume. Until then, I'm flat. The chart doesn't owe me a trade today — patience is the most underrated skill in technical analysis.`,
      ],
      'bear': [
        `Bearish price structure developing after ${shortEvent}. The chart is making lower highs and lower lows on the daily timeframe — that's a downtrend by definition, and I don't argue with the trend. The 50-day MA just crossed below the 200-day MA — a death cross that, despite its reputation as a lagging indicator, has preceded every major decline of 20%+ in the last 30 years. Volume is expanding on down moves and contracting on bounces — distribution, not accumulation. The RSI has been rejected at 50 twice, confirming bearish momentum control. The head-and-shoulders pattern on the 4-hour chart projects a measured move 10% below current levels. I'm short with a stop above the right shoulder. Don't fight the tape.`,
      ],
      'strong-bear': [
        `Complete technical breakdown. ${shortEvent} smashed through every support level on the chart like a hot knife through butter. We broke the 200-day MA, the rising trendline from the October lows, and the 61.8% Fibonacci retracement — all on massive volume. The weekly candle is a bearish engulfing pattern that swallowed the last 6 weeks of price action. The RSI has collapsed below 30 and is still falling with no divergence — no floor in sight. Volume profile shows an air pocket below current levels where there's no historical support for another 12-15%. The monthly chart is now confirming the breakdown with a bearish MACD crossover. This is a multi-timeframe sell signal across daily, weekly, and monthly charts — extremely rare and extremely bearish. Maximum short exposure with aggressive trailing stops on the upside. Next support is the prior cycle low, which is 20% below here.`,
      ],
    },
  };

  const agentAnalyses = analyses[agent.id] || {};
  const sentimentAnalyses = agentAnalyses[sentiment] || agentAnalyses['neutral'] || [
    `Analyzing ${shortEvent} through my ${agent.role} lens. Current assessment: ${SENTIMENT_LEVELS[sentiment].label} with ${confidence}% conviction.`,
  ];

  const index = Math.floor(rng() * sentimentAnalyses.length);
  let text = sentimentAnalyses[index];

  // === CRYPTO EVENT GUARDRAILS: non-crypto agents frame responses through their own lens ===
  const isCryptoTopic = /bitcoin|btc|ethereum|eth\b|crypto|defi|blockchain|solana|sol\b|altcoin/i.test(event);
  const cryptoAgents = ['crypto-max']; // agents that naturally speak crypto
  if (isCryptoTopic && !cryptoAgents.includes(agent.id)) {
    const cryptoFraming = {
      'macro-bull': `I'm not a crypto specialist, but ${shortEvent} has clear macro implications. Risk appetite in crypto signals broader liquidity trends. What matters for equities: if crypto capital rotates back into stocks, we benefit. If it stays siloed, it's neutral. My focus remains on the macro setup — the Fed, employment, and GDP are what drive my portfolio, not token prices.`,
      'doom-bear': `Crypto volatility after ${shortEvent} reinforces my thesis about speculative excess. When leveraged crypto positions unwind, it creates a contagion risk for broader risk assets. I've seen this before — remember the Luna/Terra collapse that dragged down traditional markets? I'm watching crypto stress as a canary in the coal mine for systemic risk, not as a direct trade.`,
      'quant-algo': `My models don't have a strong edge in crypto-specific price action — the data history is too short and the regime changes too frequent. That said, ${shortEvent} is affecting cross-asset correlations. BTC-SPX 30-day correlation is at 0.45, which means crypto moves are bleeding into equity factor returns. I'm adjusting my equity portfolio beta accordingly, not trading crypto directly.`,
      'tech-growth': `I view crypto through a technology adoption lens, not as a financial asset. ${shortEvent} matters because the underlying blockchain technology — smart contracts, tokenization, DeFi protocols — is driving real enterprise adoption. My portfolio exposure is through crypto-adjacent equities like COIN, MSTR, and semiconductor companies benefiting from mining demand, not through tokens directly.`,
      'value-hunter': `Crypto has no free cash flow, no earnings, and no intrinsic value in my framework — it's pure speculation. ${shortEvent} doesn't change that assessment. However, I'm watching the second-order effects: if crypto pain forces selling of quality equities to cover margin calls, that creates buying opportunities for real businesses at better prices. That's where my focus is.`,
      'fed-watcher': `${shortEvent} is relevant to me only in how it affects the Fed's thinking on financial stability and stablecoin regulation. The Fed is watching crypto leverage as a macro-prudential risk. If crypto volatility spills into Treasury markets or money market funds, that could accelerate or delay rate decisions. The crypto price itself is irrelevant to my analysis — the policy implications are what matter.`,
      'geopolitical': `I track crypto through a sanctions and capital controls lens. ${shortEvent} highlights how digital assets are used to circumvent sanctions, fund illicit activity, and move capital across borders. From a geopolitical risk perspective, crypto volatility signals changing capital flow patterns — particularly out of China, Russia, and sanctioned economies. My trades remain in traditional assets.`,
      'retail-pulse': `Retail sentiment on ${shortEvent} is absolutely wild right now. Reddit crypto subs are in full-on mania/panic mode (depending on the move), and the options flow on crypto-adjacent stocks like COIN and MSTR is showing extreme positioning. I track crypto sentiment as a leading indicator for broader retail risk appetite — when crypto traders get euphoric, it usually spills into meme stocks and weekly options within 48 hours.`,
      'income-yield': `Crypto generates zero income and pays zero dividends — it's completely outside my investment framework. ${shortEvent} doesn't change my portfolio at all. The only income play in crypto I've ever seen is staking yields, and those come with principal risk that violates my core rules. I'll stick with my 4.5% yielding dividend portfolio and let the crypto traders have their excitement.`,
      'emerging-mkts': `${shortEvent} matters for EM because crypto adoption is disproportionately concentrated in developing economies — Nigeria, India, Brazil, Turkey — where people use it as a hedge against currency devaluation. Crypto flows affect EM currency dynamics and capital account balances. I'm not trading crypto, but I'm watching Bitcoin's impact on EM capital flows and currency markets closely.`,
      'volatility-arb': `The implied vol in crypto options after ${shortEvent} is fascinating from a volatility regime perspective. BTC 30-day IV is at 65-80% while equity IV is at 15% — that's a massive vol differential that creates cross-asset opportunities. I'm looking at COIN equity options as a cheaper proxy for crypto vol exposure, and watching for any vol contagion from crypto into equity and rates vol surfaces.`,
      'price-action': `The chart on this crypto pair after ${shortEvent} is the only thing that matters — I don't care about the technology or the fundamentals. Looking at the candlestick structure, volume profile, and key support/resistance levels. Crypto charts are noisy but they respect technical levels better than most people think. My analysis is purely price-based: what do the candles say, where are the levels, and what's the risk/reward.`,
    };
    const framing = cryptoFraming[agent.id];
    if (framing) {
      text = framing;
    }
  }

  // Add reaction to other agents if past round 1 — make it a real debate
  if (priorAgents && priorAgents.length > 0 && roundNum > 1) {
    const myScore = SENTIMENT_LEVELS[sentiment]?.score || 0;

    // Find strongest disagreement
    const disagreeWith = priorAgents
      .filter(p => p.agentId !== agent.id)
      .sort((a, b) => Math.abs((SENTIMENT_LEVELS[b.sentiment]?.score || 0) - myScore) - Math.abs((SENTIMENT_LEVELS[a.sentiment]?.score || 0) - myScore))
      .find(p => Math.abs((SENTIMENT_LEVELS[p.sentiment]?.score || 0) - myScore) >= 2);

    const agreeWith = priorAgents.find(p => {
      const theirScore = SENTIMENT_LEVELS[p.sentiment]?.score || 0;
      return p.agentId !== agent.id && Math.abs(theirScore - myScore) <= 1 && theirScore !== 0;
    });

    // Agent-specific counter-arguments — not generic, but targeted
    const counterArgs = {
      'macro-bull': {
        'doom-bear': `${disagreeWith?.agent?.name || 'Diana'}, you keep citing debt levels, but corporate balance sheets are the strongest in a decade. Net debt to EBITDA is at 1.2x for the S&P — that's not fragile, that's fortress-level. Your 2008 comparison falls apart when you look at bank capital ratios.`,
        'quant-algo': `${disagreeWith?.agent?.name || 'Quinn'}, your models missed the entire 2023 rally. Pure quant ignores the macro regime change we're in — fiscal dominance + AI capex creates growth the models haven't been trained on.`,
        default: `${disagreeWith?.agent?.name || 'That'} analysis cherry-picks the bearish datapoints. Look at the full picture: ISM new orders are accelerating, consumer balance sheets are healthy, and capex is growing 8% YoY. The expansion has legs.`,
      },
      'doom-bear': {
        'macro-bull': `${disagreeWith?.agent?.name || 'Marcus'}, you're ignoring the elephant in the room. $34 trillion in government debt, commercial real estate imploding, and bank unrealized losses at $700B. This "strong economy" is built on fiscal steroids that are running out.`,
        'tech-growth': `${disagreeWith?.agent?.name || 'Tara'}, the AI story is a classic capex bubble. How many times have we seen "this time it's different"? These companies are spending $200B on GPUs with no clear monetization path. The hangover will be brutal.`,
        'crypto-max': `${disagreeWith?.agent?.name || 'Max'}, crypto is just leveraged beta. When the real deleveraging starts, BTC drops 60% in a month. Your "digital gold" narrative evaporated in 2022 and it'll happen again.`,
        default: `${disagreeWith?.agent?.name || 'Their'} optimism is dangerously naive. The credit cycle is turning — HY spreads widening, bank lending standards tightening, consumer delinquencies rising. These are late-cycle signals that always precede a recession.`,
      },
      'quant-algo': {
        default: `${disagreeWith?.agent?.name || 'Their'} qualitative argument is noise. My models process 4,000 data points daily. The systematic evidence says: momentum z-score ${myScore > 0 ? '+1.8' : '-1.4'}, breadth ${myScore > 0 ? 'expanding' : 'deteriorating'}, volatility regime ${myScore > 0 ? 'compressing' : 'shifting'}. That's what matters, not storytelling.`,
      },
      'crypto-max': {
        'doom-bear': `${disagreeWith?.agent?.name || 'Diana'}, you've been calling for a crash every quarter since 2020 while BTC went from $10K to $97K. On-chain data is undeniable — institutional wallets are accumulating, exchange reserves are at 5-year lows, and the halving cycle is intact.`,
        default: `${disagreeWith?.agent?.name || 'They'} fundamentally misunderstand crypto's macro sensitivity. With $60B in spot ETF inflows, this isn't speculative retail anymore. The liquidity flows are institutional and structural.`,
      },
      'tech-growth': {
        'value-hunter': `${disagreeWith?.agent?.name || 'Victor'}, your "P/E too high" argument has been wrong for 15 years. NVDA trades at 30x forward earnings while growing 200% YoY. That's CHEAP for that growth rate. PEG ratio is 0.3 — your value screens would flag that as a buy.`,
        'doom-bear': `${disagreeWith?.agent?.name || 'Diana'}, the AI infrastructure spend isn't speculation — it's MSFT, GOOGL, AMZN, META spending from cash flow. These companies have $500B in combined cash. The capex is self-funded. This isn't the dot-com bubble.`,
        default: `${disagreeWith?.agent?.name || 'Their'} view ignores the secular shift. Every enterprise on the planet is deploying AI. Cloud revenue is re-accelerating to 30%+ growth. The TAM expansion is real — $1T AI market by 2030 isn't a fantasy, it's consensus.`,
      },
      'value-hunter': {
        'tech-growth': `${disagreeWith?.agent?.name || 'Tara'}, you're paying 50x earnings for a "story." History shows that when the S&P forward P/E exceeds 22x, subsequent 5-year returns average 2% annually. I'll take my 6% FCF yield portfolio over your hope trade any day.`,
        default: `${disagreeWith?.agent?.name || 'Their'} momentum-chasing will end in tears. The most expensive decile of the market has underperformed the cheapest decile by 4% annually over every 10-year period since 1926. Discipline beats hype.`,
      },
      'fed-watcher': {
        default: `${disagreeWith?.agent?.name || 'Their'} analysis doesn't properly weight Fed policy transmission. The 2-year yield at ${myScore > 0 ? '4.2%' : '4.8%'} is pricing ${myScore > 0 ? 'cuts' : 'higher for longer'}. The Fed Funds futures tell you exactly where this is going — the market is ${myScore > 0 ? 'right' : 'wrong'} on timing.`,
      },
      'geopolitical': {
        default: `${disagreeWith?.agent?.name || 'They'} are underpricing geopolitical risk, as usual. My scenario analysis gives a ${myScore < 0 ? '35%' : '15%'} probability of a major supply chain disruption in the next 6 months. The defense/energy hedge has paid for itself 3 out of the last 4 quarters.`,
      },
      'retail-pulse': {
        default: `${disagreeWith?.agent?.name || 'Their'} institutional view misses what retail flow is telling us. Put/call ratio at ${myScore > 0 ? '0.62' : '1.4'}, options gamma exposure ${myScore > 0 ? 'deeply positive' : 'flipping negative'}. The crowd has been ${myScore > 0 ? 'right' : 'early but right'} at these levels historically.`,
      },
      'income-yield': {
        default: `${disagreeWith?.agent?.name || 'Their'} growth-at-any-price approach ignores the power of compounding income. My portfolio yields 4.8% with 12% annual dividend growth. That's a 10% total return with half the volatility. Show me a growth portfolio that does that consistently.`,
      },
      'emerging-mkts': {
        default: `${disagreeWith?.agent?.name || 'Their'} US-centric view is a classic home bias. EM equities trade at 10x forward earnings vs 22x for the S&P. India GDP is growing 7.5%, Indonesia 5.1%. The growth differential is massive and the currency setup is ${myScore > 0 ? 'improving' : 'the key risk'}.`,
      },
      'volatility-arb': {
        default: `${disagreeWith?.agent?.name || 'Their'} directional bet ignores what the vol surface is screaming. IV/RV ratio at ${myScore > 0 ? '0.85' : '1.4'}, skew at ${myScore > 0 ? 'flat' : 'steep'}, term structure ${myScore > 0 ? 'in contango' : 'inverting'}. ${myScore > 0 ? 'The market is over-hedged. Sell premium.' : 'Protection is cheap. Buy gamma before it reprices.'}`,
      },
      'price-action': {
        'quant-algo': `${disagreeWith?.agent?.name || 'Quinn'}, your factor models are backwards-looking noise. The chart is forward-looking — price discounts everything your models are trying to capture, but faster. While you're waiting for your momentum z-score to confirm, the candle already broke out on volume 3 days ago.`,
        'macro-bull': `${disagreeWith?.agent?.name || 'Marcus'}, GDP data is lagging garbage. By the time ISM prints, the chart has already priced it in. Price leads fundamentals — always has, always will. The daily candle structure says ${myScore > 0 ? 'buy' : 'sell'} regardless of your macro narrative.`,
        default: `${disagreeWith?.agent?.name || 'Their'} fundamental analysis is irrelevant to what the chart is showing. Support/resistance, volume, and candle structure don't lie. The tape says ${myScore > 0 ? 'buyers are in control — higher highs, higher lows, expanding volume on up moves' : 'sellers are in control — lower highs, lower lows, distribution on every bounce'}. Trade what you see, not what you think.`,
      },
    };

    // Always add a cross-agent argument in round 2+ (previously only 70% chance)
    if (disagreeWith) {
      const agentCounters = counterArgs[agent.id] || {};
      const counter = agentCounters[disagreeWith.agentId] || agentCounters.default || `${disagreeWith.agent.name}'s analysis has fundamental flaws that my framework exposes clearly.`;
      text += `\n\n${counter}`;
    } else if (agreeWith) {
      const agreements = [
        `\n\n${agreeWith.agent.name} and I are converging independently — when a ${agent.role.toLowerCase()} and a ${agreeWith.agent.role.toLowerCase()} agree, the signal is strong. Our combined frameworks cover both the quantitative and qualitative case.`,
        `\n\nBacking ${agreeWith.agent.name} here. We're looking at this from completely different angles — ${agent.sectors[0]} vs ${agreeWith.agent?.sectors?.[0] || 'their sector'} — and reaching the same conclusion. That's conviction.`,
        `\n\nI echo ${agreeWith.agent.name}. The evidence from my ${agent.sectors[0]} analysis independently confirms their thesis. When multiple uncorrelated frameworks align, you pay attention.`,
      ];
      text += agreements[Math.floor(rng() * agreements.length)];
    }
  }

  return text;
}

// Generate realistic data source citations per agent specialty
function generateDataSources(agent, sentiment, rng) {
  const score = SENTIMENT_LEVELS[sentiment]?.score || 0;
  const sources = {
    'macro-bull': [
      { name: 'BEA GDP Report', metric: `GDP growth at ${score > 0 ? '3.1' : '1.8'}% annualized`, url: 'https://www.bea.gov/data/gdp', confidence: 95 },
      { name: 'BLS Employment', metric: `NFP: +${Math.round(150 + rng() * 200)}K jobs`, url: 'https://www.bls.gov/news.release/empsit.nr0.htm', confidence: 97 },
      { name: 'ISM Manufacturing PMI', metric: `PMI at ${score > 0 ? '52.8' : '48.3'}`, url: 'https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/', confidence: 92 },
    ],
    'doom-bear': [
      { name: 'FRED Credit Spreads', metric: `HY OAS at ${score < 0 ? '520' : '380'}bps`, url: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2', confidence: 96 },
      { name: 'Fed H.8 Bank Lending', metric: `Lending ${score < 0 ? 'declining' : 'flat'} for ${Math.round(2 + rng() * 4)} months`, url: 'https://www.federalreserve.gov/releases/h8/current/', confidence: 94 },
      { name: 'S&P/Experian Consumer Credit', metric: `Delinquencies at ${(2.1 + rng() * 1.5).toFixed(1)}%`, url: 'https://www.spglobal.com/ratings/en/research/articles/consumer-credit', confidence: 88 },
    ],
    'quant-algo': [
      { name: 'Bloomberg Factor Model', metric: `Momentum z-score: ${score > 0 ? '+1.8' : '-1.4'}σ`, url: 'https://www.bloomberg.com/markets', confidence: 91 },
      { name: 'AQR Risk Parity', metric: `Sharpe ratio: ${(0.8 + rng() * 1.2).toFixed(2)}`, url: 'https://www.aqr.com/Insights/Research', confidence: 87 },
      { name: 'CBOE Market Breadth', metric: `Advance/decline: ${score > 0 ? '2.3:1' : '0.6:1'}`, url: 'https://www.cboe.com/us/equities/market_statistics/', confidence: 93 },
    ],
    'crypto-max': [
      { name: 'Glassnode On-Chain', metric: `Exchange reserves: ${score > 0 ? '↓ 5-year low' : '↑ inflows rising'}`, url: 'https://studio.glassnode.com/metrics?a=BTC&m=addresses.ActiveCount', confidence: 90 },
      { name: 'CoinGecko', metric: `BTC dominance: ${(48 + rng() * 10).toFixed(1)}%`, url: 'https://www.coingecko.com/en/global-charts', confidence: 85 },
      { name: 'DeFiLlama TVL', metric: `Total TVL: $${Math.round(80 + rng() * 60)}B`, url: 'https://defillama.com/chains', confidence: 88 },
    ],
    'tech-growth': [
      { name: 'Gartner IT Spending', metric: `AI capex forecast: $${Math.round(180 + rng() * 80)}B`, url: 'https://www.gartner.com/en/newsroom/press-releases', confidence: 89 },
      { name: 'SIA Semiconductor Data', metric: `Chip sales ${score > 0 ? '+18' : '-5'}% YoY`, url: 'https://www.semiconductors.org/resources/world-semiconductor-trade-statistics-wsts/', confidence: 94 },
      { name: 'Synergy Cloud Revenue', metric: `Cloud infrastructure +${Math.round(20 + rng() * 15)}% QoQ`, url: 'https://www.srgresearch.com/articles/cloud-market-growth-rate-nudges-up', confidence: 86 },
    ],
    'value-hunter': [
      { name: 'S&P Capital IQ', metric: `S&P 500 fwd P/E: ${(18 + rng() * 5).toFixed(1)}x`, url: 'https://www.spglobal.com/marketintelligence/', confidence: 93 },
      { name: 'Morningstar Valuations', metric: `${score < 0 ? '68' : '42'}% of coverage undervalued`, url: 'https://www.morningstar.com/market-fair-value', confidence: 87 },
      { name: 'Damodaran FCF Yield', metric: `Median FCF yield: ${(3.5 + rng() * 3).toFixed(1)}%`, url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/pedata.html', confidence: 91 },
    ],
    'fed-watcher': [
      { name: 'CME FedWatch', metric: `${score > 0 ? '78' : '23'}% prob of cut at next meeting`, url: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html', confidence: 95 },
      { name: 'FRED Yield Curve', metric: `10Y-2Y spread: ${score > 0 ? '+15' : '-25'}bps`, url: 'https://fred.stlouisfed.org/series/T10Y2Y', confidence: 97 },
      { name: 'Fed Minutes', metric: `${score > 0 ? 'Dovish' : 'Hawkish'} tone in latest minutes`, url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm', confidence: 96 },
    ],
    'geopolitical': [
      { name: 'IHS Markit Geo-Risk', metric: `Global risk index: ${Math.round(55 + rng() * 30)}/100`, url: 'https://www.spglobal.com/marketintelligence/en/mi/products/country-risk-scores.html', confidence: 82 },
      { name: 'EIA Weekly Petroleum', metric: `Crude inventories ${score < 0 ? '↓ 8.2M' : '↑ 3.1M'} barrels`, url: 'https://www.eia.gov/petroleum/supply/weekly/', confidence: 95 },
      { name: 'SIPRI Arms Monitor', metric: `Defense spending +${Math.round(3 + rng() * 8)}% globally`, url: 'https://www.sipri.org/databases/milex', confidence: 88 },
    ],
    'retail-pulse': [
      { name: 'Unusual Whales', metric: `Options flow: ${score > 0 ? 'heavy call buying' : 'put surge'}`, url: 'https://unusualwhales.com/flow', confidence: 78 },
      { name: 'AAII Sentiment', metric: `Bull/bear: ${score > 0 ? '48/22' : '25/51'}%`, url: 'https://www.aaii.com/sentimentsurvey', confidence: 90 },
      { name: 'Reddit WSB Tracker', metric: `Ticker mentions ${score > 0 ? '↑ 340%' : '↓ 60%'} 7d`, url: 'https://www.reddit.com/r/wallstreetbets/hot/', confidence: 62 },
    ],
    'income-yield': [
      { name: 'S&P Dividend Aristocrats', metric: `Avg yield: ${(2.8 + rng() * 1.5).toFixed(1)}%, payout: ${Math.round(45 + rng() * 20)}%`, url: 'https://www.spglobal.com/spdji/en/indices/dividends/sp-500-dividend-aristocrats/', confidence: 94 },
      { name: "Moody's Credit Outlook", metric: `IG default rate: ${(0.3 + rng() * 0.5).toFixed(1)}%`, url: 'https://www.moodys.com/research', confidence: 92 },
      { name: 'Treasury Yield Monitor', metric: `10Y: ${(3.8 + rng() * 1.2).toFixed(2)}%, real yield: ${(1.5 + rng() * 0.8).toFixed(2)}%`, url: 'https://www.treasury.gov/resource-center/data-chart-center/interest-rates/', confidence: 97 },
    ],
    'emerging-mkts': [
      { name: 'World Bank EM Outlook', metric: `EM GDP forecast: +${(4 + rng() * 2).toFixed(1)}%`, url: 'https://www.worldbank.org/en/publication/global-economic-prospects', confidence: 90 },
      { name: 'MSCI EM Index', metric: `EM P/E: ${(10 + rng() * 3).toFixed(1)}x vs DM ${(19 + rng() * 4).toFixed(1)}x`, url: 'https://www.msci.com/emerging-markets', confidence: 93 },
      { name: 'DXY Dollar Index', metric: `DXY at ${(100 + rng() * 8).toFixed(1)}`, url: 'https://www.marketwatch.com/investing/index/dxy', confidence: 88 },
    ],
    'volatility-arb': [
      { name: 'CBOE VIX Data', metric: `VIX: ${(14 + rng() * 18).toFixed(1)}, VIX9D: ${(12 + rng() * 15).toFixed(1)}`, url: 'https://www.cboe.com/us/indices/dashboard/VIX/', confidence: 96 },
      { name: 'OptionMetrics IV Surface', metric: `30d IV/RV: ${(0.8 + rng() * 0.6).toFixed(2)}`, url: 'https://optionmetrics.com/data-products/', confidence: 85 },
      { name: 'CBOE Skew Index', metric: `SKEW: ${Math.round(120 + rng() * 30)}`, url: 'https://www.cboe.com/us/indices/dashboard/SKEW/', confidence: 93 },
    ],
    'price-action': [
      { name: 'TradingView Chart', metric: `RSI(14): ${(30 + rng() * 45).toFixed(1)}, ADX: ${(15 + rng() * 30).toFixed(1)}`, url: 'https://www.tradingview.com/chart/', confidence: 90 },
      { name: 'StockCharts Breadth', metric: `${score > 0 ? '73' : '34'}% above 200-day MA, A/D line ${score > 0 ? 'new high' : 'diverging'}`, url: 'https://stockcharts.com/h-sc/ui?s=%24BPSPX', confidence: 88 },
      { name: 'Finviz Heatmap', metric: `Volume ${score > 0 ? '1.8x avg on up days' : '2.1x avg on down days'}`, url: 'https://finviz.com/map.ashx', confidence: 85 },
    ],
  };

  const agentSources = sources[agent.id] || [{ name: 'Market Data', metric: 'General analysis', url: '#' }];
  // Return 2 sources randomly selected
  const shuffled = [...agentSources].sort(() => rng() - 0.5);
  return shuffled.slice(0, 2);
}

function generateTradeIdeas(agent, sentiment, event, rng) {
  const bullTrades = {
    'macro-bull': ['Long SPY', 'Long XLI (Industrials)', 'Long XLF (Financials)'],
    'doom-bear': ['Reduce VIX calls', 'Trim gold position', 'Add IG bonds'],
    'quant-algo': ['Long momentum factor', 'Long QQQ', 'Short VIX futures'],
    'crypto-max': ['Long BTC', 'Long ETH', 'Long SOL', 'Add DeFi exposure'],
    'tech-growth': ['Long NVDA', 'Long MSFT', 'Long GOOGL', 'Long SMH'],
    'value-hunter': ['Long XLF', 'Long energy majors', 'Long BRK.B'],
    'fed-watcher': ['Long TLT (Long bonds)', 'Long XLU', 'Long REITs'],
    'geopolitical': ['Trim defense', 'Add EM exposure', 'Long copper'],
    'retail-pulse': ['Long TSLA calls', 'Long meme basket', 'Long weekly calls'],
    'income-yield': ['Add dividend aristocrats', 'Long SCHD', 'Add preferred shares'],
    'emerging-mkts': ['Long EEM', 'Long INDA (India)', 'Long Brazil ETF'],
    'volatility-arb': ['Sell SPX puts', 'Sell straddles', 'Short VIX futures'],
    'price-action': ['Long breakout above resistance', 'Buy pullback to 50-day MA', 'Long golden cross setup'],
  };

  const bearTrades = {
    'macro-bull': ['Trim cyclicals', 'Add defensive names', 'Raise cash 10%'],
    'doom-bear': ['Long VIX calls', 'Long gold', 'Short HY credit', 'Long puts'],
    'quant-algo': ['Short momentum', 'Long defensive factor', 'Reduce gross exposure'],
    'crypto-max': ['Move to stablecoins', 'Close altcoin longs', 'Keep BTC core only'],
    'tech-growth': ['Trim NVDA', 'Rotate to cash-flow tech', 'Reduce position sizes'],
    'value-hunter': ['Long healthcare', 'Long consumer staples', 'Raise cash'],
    'fed-watcher': ['Short TLT', 'Short duration', 'Long TIPS'],
    'geopolitical': ['Long XLE (Energy)', 'Long defense ETF', 'Long gold'],
    'retail-pulse': ['Buy puts', 'Close leveraged longs', 'Move to cash'],
    'income-yield': ['Rotate to Treasuries', 'Trim HY', 'Up quality'],
    'emerging-mkts': ['Short EEM', 'Long dollar', 'Close EM positions'],
    'volatility-arb': ['Long VIX calls', 'Buy put spreads', 'Long gamma'],
    'price-action': ['Short breakdown below support', 'Short death cross setup', 'Fade failed breakout'],
  };

  const score = SENTIMENT_LEVELS[sentiment]?.score || 0;
  const trades = score >= 0 ? bullTrades[agent.id] : bearTrades[agent.id];

  if (!trades) return ['Hold current positions'];

  // Pick 1-3 trades
  const count = Math.min(trades.length, 1 + Math.floor(rng() * 3));
  const selected = [];
  const available = [...trades];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * available.length);
    selected.push(available.splice(idx, 1)[0]);
  }

  return selected;
}

// Generate dynamic shock events based on the current seed event / ticker
export function generateDynamicShocks(seedEvent) {
  const e = seedEvent.toLowerCase();

  // Stock-specific shocks
  if (/nvid|nvidia/i.test(e)) return [
    'NVIDIA misses earnings by 15%, guides down on weakening AI demand',
    'US bans NVIDIA chip exports to China, Middle East — revenue hit estimated at $8B',
    'AMD unveils MI400 chip beating NVIDIA H200 in benchmarks by 40%',
    'NVIDIA announces 10:1 stock split and $50B buyback program',
    'Major cloud provider cancels $12B NVIDIA GPU order, citing overcapacity',
    'SEC opens investigation into NVIDIA revenue recognition practices',
  ];
  if (/apple|aapl/i.test(e)) return [
    'Apple iPhone sales plunge 25% in China as Huawei gains market share',
    'Apple announces $400B AI partnership with Google, stock surges',
    'EU hits Apple with $20B antitrust fine, forces App Store changes',
    'Apple Vision Pro sales disappoint — only 200K units in Q1',
    'Apple cuts dividend and buyback program for first time in a decade',
    'Apple unveils breakthrough AR glasses at $999, preorders sell out in hours',
  ];
  if (/tesla|tsla/i.test(e)) return [
    'Tesla Cybertruck recall affects 500K vehicles, production halted',
    'Tesla FSD achieves Level 5 autonomy approval from NHTSA',
    'Elon Musk steps down as Tesla CEO to focus on other ventures',
    'Tesla energy storage revenue surpasses auto revenue for first time',
    'Major Tesla factory fire disrupts production for 3 months',
    'Tesla robotaxi fleet launches in 10 cities, $1/mile pricing undercuts Uber',
  ];
  if (/msft|microsoft/i.test(e)) return [
    'Microsoft Azure suffers 72-hour global outage, enterprise clients flee',
    'Microsoft Copilot drives Office 365 revenue up 40% QoQ',
    'DOJ files antitrust suit against Microsoft over AI monopoly',
    'Microsoft announces surprise $50B acquisition of Palantir',
    'OpenAI board fires Sam Altman again, Microsoft AI strategy in question',
    'Microsoft Cloud revenue decelerates to 15% growth, worst in 5 years',
  ];
  if (/googl|alphabet|google/i.test(e)) return [
    'Google loses antitrust case — forced to divest Chrome browser',
    'Gemini AI surpasses ChatGPT in enterprise adoption metrics',
    'Google ad revenue declines YoY for the first time ever',
    'Google announces $100B quantum computing breakthrough partnership',
    'YouTube premium subscribers hit 200M, ad-free model accelerates',
    'Google Cloud loses major Pentagon contract to AWS',
  ];
  if (/meta/i.test(e)) return [
    'Meta Reality Labs losses reach $20B annually, investor revolt brewing',
    'Meta AI assistant hits 1B monthly users, monetization begins',
    'Instagram loses 30% of Gen Z users to TikTok alternative',
    'Meta announces $30B metaverse write-down, pivots to AI-only strategy',
    'Meta ad targeting hit by new EU privacy regulation, CPMs drop 40%',
    'Meta Threads surpasses X/Twitter with 500M daily active users',
  ];
  if (/amzn|amazon/i.test(e)) return [
    'Amazon AWS growth decelerates to 12%, cloud pricing war intensifies',
    'Amazon announces same-day drone delivery in 50 cities',
    'FTC breaks up Amazon — AWS forced to spin off as separate company',
    'Amazon Prime membership hits 300M globally, retail margins expanding',
    'Amazon warehouse workers unionize nationwide, labor costs surge 25%',
    'Amazon healthcare division disrupts $4T industry with AI diagnostics',
  ];

  // Crypto-specific shocks
  if (/bitcoin|btc/i.test(e)) return [
    'Bitcoin flash crashes 30% on major exchange insolvency rumors',
    'US Treasury announces Bitcoin strategic reserve — buying 1M BTC',
    'China lifts crypto ban, opens regulated exchanges',
    'Bitcoin mining difficulty spikes 40%, small miners capitulate',
    'Massive $10B Bitcoin whale wallet dumps entire position',
    'Bitcoin ETF daily inflows hit $5B, BlackRock calls it "digital gold"',
  ];
  if (/ethereum|eth/i.test(e)) return [
    'Ethereum network suffers critical consensus bug, chain halts for 6 hours',
    'Ethereum staking yields surge to 12% as demand explodes',
    'SEC classifies ETH as a security, exchanges delist immediately',
    'Ethereum L2s process 10x more transactions than Solana, fees near zero',
    'Major DeFi protocol on Ethereum exploited for $2B',
    'Ethereum spot ETF approved, $15B inflows in first week',
  ];
  if (/solana|sol/i.test(e)) return [
    'Solana network goes down for 48 hours during market volatility',
    'Solana DeFi TVL surpasses Ethereum for the first time',
    'Major Solana memecoin rug pull wipes out $5B in retail wealth',
    'Visa launches stablecoin payments on Solana, institutional adoption surges',
    'Solana phone sales hit 5M units, mobile crypto adoption accelerating',
    'Solana validator concentration raises centralization concerns',
  ];
  if (/crypto|defi|blockchain/i.test(e)) return [
    'Major crypto exchange hacked — $10B in user funds stolen',
    'US passes comprehensive crypto regulation bill, market celebrates',
    'Stablecoin depegging event triggers $50B in liquidations',
    'Global crypto market cap surpasses $5T for the first time',
    'Central banks announce joint CBDC that competes directly with crypto',
    'DeFi protocol yields spike to 25% as new liquidity wave arrives',
  ];

  // Sector/macro shocks
  if (/fed|rate|fomc|monetary|powell/i.test(e)) return [
    'Surprise 75bps emergency rate hike — inflation out of control',
    'Fed announces end of quantitative tightening, balance sheet expansion resumes',
    'Powell resigns unexpectedly, dove appointed as replacement',
    'Fed signals 5 rate cuts in 2025, market rallies 8% in a day',
    'Fed minutes reveal deep divisions — 3 dissents on rate decision',
    'CPI prints at 0.8% MoM — highest since 1980, emergency meeting called',
  ];
  if (/tariff|trade.*war|china.*import/i.test(e)) return [
    'China retaliates with 50% tariffs on all US agricultural exports',
    'Trade deal breakthrough — all tariffs to be phased out over 2 years',
    'US allies join tariff coalition, expanding to EU and Japan',
    'Supply chain reshoring costs hit $500B, inflation re-accelerates',
    'China devalues yuan 10% in response to tariffs, currency war erupts',
    'Major US retailers warn of 30% price increases due to tariffs',
  ];
  if (/oil|energy|opec/i.test(e)) return [
    'Oil spikes to $150/barrel on Middle East supply disruption',
    'OPEC+ collapses, Saudi Arabia floods market — oil drops to $40',
    'US strategic petroleum reserve hits zero, no buffer remaining',
    'Major oil discovery in Guyana doubles global proven reserves',
    'EU carbon tax makes fossil fuels 40% more expensive overnight',
    'Nuclear fusion breakthrough announced — energy stocks crater 25%',
  ];
  if (/inflation|cpi/i.test(e)) return [
    'Core CPI spikes to 6% — stagflation fears materialize',
    'Deflation surprise: CPI prints -0.3%, rate cuts imminent',
    'Wage-price spiral confirmed — average hourly earnings up 7% YoY',
    'Rent inflation collapses as multifamily supply floods market',
    'Producer prices surge 12% — pipeline inflation heading to consumers',
    'Inflation expectations unanchor — 5Y breakeven hits 4.5%',
  ];

  // Generic fallback — context-aware but general
  if (/invest in (\S+)/i.test(e)) {
    const m = e.match(/invest in (\S+)/i);
    const ticker = m[1].replace('?', '').toUpperCase();
    return [
      `${ticker} misses earnings estimates by 20%, guides down significantly`,
      `${ticker} announces massive share buyback and special dividend`,
      `Short-seller publishes damning report on ${ticker}, stock drops 15%`,
      `${ticker} CEO resigns amid accounting irregularities investigation`,
      `Activist investor takes 10% stake in ${ticker}, demands board seats`,
      `${ticker} wins major government contract worth $10B over 5 years`,
    ];
  }

  // Default macro shocks
  return [
    'S&P 500 flash crashes 8% in 30 minutes on algorithmic selling',
    'Surprise 50bps rate cut announced by the Federal Reserve',
    'Major US bank fails — contagion fears spread to regional banks',
    'US enters technical recession — two consecutive negative GDP prints',
    'Russia-NATO tensions escalate to direct military confrontation',
    'AI bubble bursts — major tech stocks down 20% in a week',
    'China invades Taiwan — semiconductor supply chain in jeopardy',
    'Massive crypto exchange hack — $10B stolen',
    'Oil hits $150/barrel on Middle East supply disruption',
    'US CPI spikes to 6% — stagflation fears materialize',
  ];
}

// Run a full simulation round
export function runSimulationRound(event, priorRounds, roundNum, seed = 42) {
  const rng = seededRandom(seed + roundNum * 1000);
  const lastRound = priorRounds.length > 0 ? priorRounds[priorRounds.length - 1] : [];

  const responses = AGENTS.map(agent => {
    return generateAgentResponse(agent, event, null, lastRound, roundNum, rng);
  });

  return responses;
}

// Inject a market shock and get agent reactions
export function injectShock(shock, currentState, roundNum, seed = 42) {
  const rng = seededRandom(seed + roundNum * 2000 + 777);

  const responses = AGENTS.map(agent => {
    const priorResponse = currentState.find(s => s.agentId === agent.id);
    const priorSentiment = priorResponse?.sentiment || 'neutral';

    const response = generateAgentResponse(agent, shock, priorResponse, currentState, roundNum, rng);

    // Track if sentiment flipped
    const priorScore = SENTIMENT_LEVELS[priorSentiment]?.score || 0;
    const newScore = SENTIMENT_LEVELS[response.sentiment]?.score || 0;
    const flipped = (priorScore > 0 && newScore < 0) || (priorScore < 0 && newScore > 0);

    return {
      ...response,
      flipped,
      previousSentiment: priorSentiment,
      shockReaction: true,
    };
  });

  return responses;
}

// Generate synthesis report after rounds
export function generateReport(allRounds, seedEvent, shocks) {
  const latestRound = allRounds[allRounds.length - 1] || [];

  // Calculate consensus
  const sentimentScores = latestRound.map(r => SENTIMENT_LEVELS[r.sentiment]?.score || 0);
  const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
  const bulls = sentimentScores.filter(s => s > 0).length;
  const bears = sentimentScores.filter(s => s < 0).length;
  const neutrals = sentimentScores.filter(s => s === 0).length;

  // Track sentiment evolution
  const sentimentHistory = allRounds.map((round, i) => {
    const scores = round.map(r => SENTIMENT_LEVELS[r.sentiment]?.score || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      round: i + 1,
      average: Math.round(avg * 100) / 100,
      bulls: scores.filter(s => s > 0).length,
      bears: scores.filter(s => s < 0).length,
      neutrals: scores.filter(s => s === 0).length,
    };
  });

  // Identify coalitions
  const bullCoalition = latestRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0);
  const bearCoalition = latestRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0);

  // Aggregate trade ideas
  const allTrades = {};
  latestRound.forEach(r => {
    r.trades.forEach(t => {
      allTrades[t] = (allTrades[t] || 0) + 1;
    });
  });
  const topTrades = Object.entries(allTrades).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Calculate confidence-weighted sentiment
  const weightedSentiment = latestRound.reduce((sum, r) => {
    return sum + (SENTIMENT_LEVELS[r.sentiment]?.score || 0) * (r.confidence / 100);
  }, 0) / latestRound.length;

  // Overall verdict
  let verdict, verdictColor;
  if (avgSentiment > 0.8) {
    verdict = 'STRONG BUY';
    verdictColor = '#10b981';
  } else if (avgSentiment > 0.3) {
    verdict = 'BUY';
    verdictColor = '#34d399';
  } else if (avgSentiment > -0.3) {
    verdict = 'HOLD';
    verdictColor = '#f59e0b';
  } else if (avgSentiment > -0.8) {
    verdict = 'SELL';
    verdictColor = '#f87171';
  } else {
    verdict = 'STRONG SELL';
    verdictColor = '#ef4444';
  }

  // Disagreement index
  const variance = sentimentScores.reduce((sum, s) => sum + Math.pow(s - avgSentiment, 2), 0) / sentimentScores.length;
  const disagreement = Math.round(Math.sqrt(variance) * 50);

  return {
    seedEvent,
    shocks,
    totalRounds: allRounds.length,
    consensus: {
      verdict,
      verdictColor,
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      weightedSentiment: Math.round(weightedSentiment * 100) / 100,
      bulls,
      bears,
      neutrals,
      disagreementIndex: Math.min(100, disagreement),
    },
    sentimentHistory,
    bullCoalition: bullCoalition.map(r => ({ name: r.agent.name, role: r.agent.role, sentiment: r.sentiment, confidence: r.confidence })),
    bearCoalition: bearCoalition.map(r => ({ name: r.agent.name, role: r.agent.role, sentiment: r.sentiment, confidence: r.confidence })),
    topTrades,
    bullCase: generateBullCase(latestRound, seedEvent),
    bearCase: generateBearCase(latestRound, seedEvent),
    riskFactors: generateRiskFactors(latestRound),
    timestamp: new Date().toISOString(),
  };
}

function generateBullCase(latestRound, event) {
  const bullAgents = latestRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0);
  const keyPoints = [
    'Macro fundamentals remain supportive with strong employment and consumer spending',
    'Technical momentum indicators showing bullish continuation patterns',
    'Central bank policy trajectory favors risk assets in the near term',
    'Institutional positioning suggests further upside potential',
    'Earnings growth trajectory supports current valuations',
  ];
  return {
    probability: Math.round(30 + (bullAgents.length / AGENTS.length) * 50),
    targetMove: `+${(3 + Math.random() * 8).toFixed(1)}%`,
    timeframe: '3-6 months',
    keyPoints: keyPoints.slice(0, 3 + Math.floor(Math.random() * 2)),
    leadingAgents: bullAgents.slice(0, 3).map(a => a.agent.name),
  };
}

function generateBearCase(latestRound, event) {
  const bearAgents = latestRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0);
  const keyPoints = [
    'Credit stress indicators beginning to flash warning signals',
    'Geopolitical risks remain elevated with multiple potential catalysts',
    'Valuation multiples stretched relative to historical averages',
    'Liquidity conditions tightening as central banks reduce balance sheets',
    'Leading economic indicators showing signs of deceleration',
  ];
  return {
    probability: Math.round(30 + (bearAgents.length / AGENTS.length) * 50),
    targetMove: `-${(5 + Math.random() * 12).toFixed(1)}%`,
    timeframe: '3-6 months',
    keyPoints: keyPoints.slice(0, 3 + Math.floor(Math.random() * 2)),
    leadingAgents: bearAgents.slice(0, 3).map(a => a.agent.name),
  };
}

function generateRiskFactors(latestRound) {
  return [
    { factor: 'Liquidity Risk', level: Math.round(30 + Math.random() * 50), description: 'Market depth and bid-ask spreads' },
    { factor: 'Volatility Risk', level: Math.round(20 + Math.random() * 60), description: 'Implied vs realized vol divergence' },
    { factor: 'Correlation Risk', level: Math.round(25 + Math.random() * 45), description: 'Cross-asset correlation breakdown' },
    { factor: 'Geopolitical Risk', level: Math.round(30 + Math.random() * 55), description: 'Global tension and conflict risk' },
    { factor: 'Policy Risk', level: Math.round(20 + Math.random() * 50), description: 'Central bank and regulatory uncertainty' },
  ];
}

// Generate debate exchanges between agents who disagree
export function generateDebateExchanges(allRounds) {
  if (allRounds.length < 2) return []

  const latest = allRounds[allRounds.length - 1]
  const exchanges = []

  // Find the most extreme bull and bear
  let maxBull = null, maxBear = null, maxBullScore = -Infinity, maxBearScore = Infinity
  latest.forEach(r => {
    const score = SENTIMENT_LEVELS[r.sentiment]?.score || 0
    if (score > maxBullScore) { maxBullScore = score; maxBull = r }
    if (score < maxBearScore) { maxBearScore = score; maxBear = r }
  })

  if (maxBull && maxBear && maxBullScore > 0 && maxBearScore < 0) {
    exchanges.push({
      type: 'clash',
      attacker: maxBear,
      defender: maxBull,
      attackText: generateAttackText(maxBear, maxBull),
      defenseText: generateDefenseText(maxBull, maxBear),
    })
  }

  // Find pairs with biggest disagreement for additional exchanges
  const sorted = [...latest].sort((a, b) => (SENTIMENT_LEVELS[b.sentiment]?.score || 0) - (SENTIMENT_LEVELS[a.sentiment]?.score || 0))
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]
    const b = sorted[sorted.length - 1 - i]
    if (a.agentId === maxBull?.agentId || a.agentId === maxBear?.agentId) continue
    if (b.agentId === maxBull?.agentId || b.agentId === maxBear?.agentId) continue
    const scoreA = SENTIMENT_LEVELS[a.sentiment]?.score || 0
    const scoreB = SENTIMENT_LEVELS[b.sentiment]?.score || 0
    if (Math.abs(scoreA - scoreB) >= 2) {
      exchanges.push({
        type: 'debate',
        attacker: scoreB < scoreA ? b : a,
        defender: scoreB < scoreA ? a : b,
        attackText: generateAttackText(scoreB < scoreA ? b : a, scoreB < scoreA ? a : b),
        defenseText: generateDefenseText(scoreB < scoreA ? a : b, scoreB < scoreA ? b : a),
      })
      break // Just one extra exchange
    }
  }

  return exchanges
}

function generateAttackText(attacker, defender) {
  const name = attacker.agent.name
  const targetName = defender.agent.name
  const attacks = [
    `${name}: "${targetName}, your analysis completely ignores the warning signs. The credit markets are telling a different story than your rosy equity outlook. You're going to get blindsided."`,
    `${name}: "I fundamentally disagree with ${targetName}. The data they're citing is backward-looking. By the time their thesis plays out, the risk-reward will have already shifted dramatically."`,
    `${name}: "${targetName} is making the classic mistake of fighting the last war. The macro regime has changed — their framework doesn't apply to the current environment."`,
    `${name}: "With respect, ${targetName}'s conviction here is misplaced. They're anchoring on a narrative rather than following the data. The probability distribution is much wider than they're accounting for."`,
    `${name}: "${targetName}, you're cherry-picking the indicators that support your view while dismissing the ones that contradict it. That's confirmation bias, not analysis."`,
  ]
  return attacks[Math.floor(Math.random() * attacks.length)]
}

function generateDefenseText(defender, attacker) {
  const name = defender.agent.name
  const targetName = attacker.agent.name
  const defenses = [
    `${name}: "${targetName} has been calling for doom for months and the market keeps proving them wrong. At some point, you need to respect the price action. My models account for the risks they're flagging."`,
    `${name}: "I hear ${targetName}'s concerns, but they're overweighting tail risks at the expense of the base case. The data supports my position with 70%+ probability. Risk management handles the rest."`,
    `${name}: "${targetName}'s framework is too narrow. They're laser-focused on one variable while ignoring the broader mosaic of evidence. My analysis incorporates a wider set of inputs."`,
    `${name}: "The bearish argument from ${targetName} sounds compelling in theory, but it's not showing up in the actual data flow. I trade what IS, not what MIGHT be."`,
    `${name}: "${targetName} makes a fair point about the risks, but every market environment has risks. The question is whether you're being compensated for them — and right now, you are."`,
  ]
  return defenses[Math.floor(Math.random() * defenses.length)]
}

// Generate a final consensus conclusion after all rounds
export function generateConsensusConclusion(allRounds, seedEvent, shocks) {
  const latest = allRounds[allRounds.length - 1] || []
  if (latest.length === 0) return null

  const scores = latest.map(r => SENTIMENT_LEVELS[r.sentiment]?.score || 0)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const bulls = latest.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0)
  const bears = latest.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0)
  const neutrals = latest.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) === 0)

  // Find the strongest advocates
  const strongestBull = bulls.sort((a, b) => (SENTIMENT_LEVELS[b.sentiment]?.score || 0) - (SENTIMENT_LEVELS[a.sentiment]?.score || 0))[0]
  const strongestBear = bears.sort((a, b) => (SENTIMENT_LEVELS[a.sentiment]?.score || 0) - (SENTIMENT_LEVELS[b.sentiment]?.score || 0))[0]

  // Confidence-weighted sentiment
  const weightedAvg = latest.reduce((sum, r) => sum + (SENTIMENT_LEVELS[r.sentiment]?.score || 0) * (r.confidence / 100), 0) / latest.length

  // Determine final verdict
  let verdict, explanation, actionItems
  if (avg > 0.8) {
    verdict = 'STRONG BUY'
    explanation = `After ${allRounds.length} rounds of debate, the panel reached a strong bullish consensus. ${bulls.length} of ${AGENTS.length} agents are bullish, led by ${strongestBull?.agent.name || 'the majority'}. Even the bears acknowledged some merit in the bull case, though ${strongestBear?.agent.name || 'skeptics'} maintained hedging recommendations.`
    actionItems = ['Increase equity exposure', 'Add to momentum positions', 'Reduce cash allocation', 'Consider leveraged upside plays']
  } else if (avg > 0.3) {
    verdict = 'BUY'
    explanation = `The consensus leans bullish after thorough debate. ${bulls.length} agents favor buying while ${bears.length} remain cautious. ${strongestBull?.agent.name || 'The bulls'} made the strongest case, arguing the risk-reward is favorable. ${strongestBear?.agent.name || 'The bears'} conceded some points but urged position sizing discipline.`
    actionItems = ['Gradually increase exposure', 'Focus on quality names', 'Maintain some hedges', 'Set clear stop-loss levels']
  } else if (avg > -0.3) {
    verdict = 'HOLD'
    explanation = `The agents are deeply divided — no clear consensus emerged. ${bulls.length} are bullish, ${bears.length} bearish, and ${neutrals.length} neutral. The debate was heated, with ${strongestBull?.agent.name || 'bulls'} and ${strongestBear?.agent.name || 'bears'} unable to convince the other side. The prudent move is to wait for more clarity.`
    actionItems = ['Maintain current positions', 'Avoid adding new risk', 'Watch for catalysts', 'Tighten stop-losses on existing positions']
  } else if (avg > -0.8) {
    verdict = 'SELL'
    explanation = `The bear case won the debate. ${bears.length} agents recommend reducing risk, while only ${bulls.length} maintain a bullish stance. ${strongestBear?.agent.name || 'The bears'} presented compelling evidence of deteriorating conditions. ${strongestBull?.agent.name || 'The remaining bulls'} agreed to reduce position sizes even while maintaining directional conviction.`
    actionItems = ['Reduce equity exposure', 'Raise cash levels', 'Add defensive hedges', 'Rotate to quality and low-beta']
  } else {
    verdict = 'STRONG SELL'
    explanation = `Near-unanimous bearish consensus. ${bears.length} of ${AGENTS.length} agents recommend aggressive de-risking. ${strongestBear?.agent.name || 'The bears'} dominated the debate with ${strongestBull?.agent.name || 'even the bulls'} conceding significant downside risk. The panel agrees: capital preservation is the top priority.`
    actionItems = ['Significantly reduce exposure', 'Maximum cash position', 'Add put protection', 'Long volatility as insurance']
  }

  // Generate key debate points
  const keyDebatePoints = []
  if (strongestBull) {
    keyDebatePoints.push({
      agent: strongestBull.agent.name,
      side: 'bull',
      point: `Argued that the current setup offers favorable risk-reward with strong fundamental support.`,
    })
  }
  if (strongestBear) {
    keyDebatePoints.push({
      agent: strongestBear.agent.name,
      side: 'bear',
      point: `Warned about deteriorating conditions and urged defensive positioning.`,
    })
  }
  if (neutrals.length > 0) {
    keyDebatePoints.push({
      agent: neutrals[0].agent.name,
      side: 'neutral',
      point: `Called for patience, arguing the data is too mixed for a strong directional bet.`,
    })
  }

  return {
    verdict,
    explanation,
    actionItems,
    keyDebatePoints,
    voteBreakdown: { bulls: bulls.length, bears: bears.length, neutrals: neutrals.length },
    avgSentiment: Math.round(avg * 100) / 100,
    weightedSentiment: Math.round(weightedAvg * 100) / 100,
    totalRounds: allRounds.length,
    shockCount: shocks?.length || 0,
  }
}
