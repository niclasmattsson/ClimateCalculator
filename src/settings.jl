# Everything that pins the model to a particular vintage of observations. Changing a value
# here changes what the model says, so the precalculated history cache stores these settings
# and refuses to load if they no longer match (see cachehistory.jl).

# Last year of prescribed history: before it the model follows observations, from it the
# user's designed emission pathway takes over. Also the year the UI starts drawing at.
const BASEYEAR = 2023

# Window used to fit the aerosol forcing factor and the CO2 fertilization factor.
# A long window fits a trajectory; the three-year window used before 2026 only pinned an
# endpoint. Must start after BASELINEYEARS so the modelled baseline is complete first.
const CALIBRATIONYEARS = 1960:BASEYEAR

# Zero point for both observed and modelled temperature, as in IPCC AR6.
const BASELINEYEARS = 1850:1900

# Observed temperature used for calibration: :GISS, :HADCRUT5, :NOAA, or :mean of the three.
const TEMPSERIES = :mean

# Years at which the precalculated history cache stores model state. The extra node at
# BASEYEAR lets a run start exactly there instead of integrating up from the last decade.
const CACHEYEARS = [1800:10:10*fld(BASEYEAR, 10); BASEYEAR]

# Solar forcing is a repeating cycle in the RCP files. Beyond the observed record we use its
# cycle average instead, so that projections do not carry a spurious 11-year wiggle.
const CONSTANTSOLARRF = true

# Splice year for the observed concentration record: NOAA GML global means from here on,
# RCP historical concentrations (observation-based) before. NOAA CO2 starts 1979, CH4 1983,
# N2O 2001. SPLICEBLEND is the number of years over which the level difference between the
# two records is faded out; it must end well before BASEYEAR.
const CONCENTRATIONSPLICE = Dict(:CO2 => 1980, :CH4 => 1985, :N2O => 2002)
const SPLICEBLEND = 15

# Natural background emissions, added to the anthropogenic emissions the interface sends.
# 270 MtCH4 and 10.7 MtN (IPCC TAR p253).
const NATURALCH4 = 270.0
const NATURALN2O = 10.7

# Years over which the RCP emission record is faded into the Global Carbon Budget record,
# which starts in 1959 and puts land-use CO2 about 0.9 GtC/year higher at that point.
const EMISSIONBLEND = 30

@assert BASELINEYEARS[end] < CALIBRATIONYEARS[1] "the temperature baseline must be complete before the calibration window opens"
@assert CACHEYEARS[end] == BASEYEAR
