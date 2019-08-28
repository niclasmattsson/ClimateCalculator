let
	# if maxlayers is redefined, must remake the calibration cache or run without it (set usecache=false)
	global const maxlayers = 50			# 15-100 (model gets unstable if too high relative to time step, see stabilitycheck())

	secondsperyear	= 365*24*60*60		# [s/year]
	k				= 1.5/1e4			# thermal diffusivity of deep ocean [m^2/s]  (default 1.5 cm^2/s)
	w				= 4/secondsperyear	# mean ocean upwelling rate [m/s]  (default 4 m/yr)
	polarwaterratio	= 0.2				# ratio of Δtemp of downwelling polar water to mean Δtemp of surface ocean [unitless]
	mixeddepth		= 70.0				# depth of mixed layer [m]
	rho				= 1026				# density of seawater [kg/m3]
	c				= 3996				# specific heat capacity of seawater [J/kgK]
	oceanarea		= 0.71				# fraction of earth's surface covered by ocean [unitless]
	a_L_O_exch		= 0.31		
	b_L_O_exch		= 1.59		
	marinewarming 	= 1.3				# marine surface air warming enhancement [unitless]
	oceandepth		= 3688				# average depth of the ocean [m]

	zstep			= (oceandepth - mixeddepth)/maxlayers	# vertical length of each discrete layer below surface layer [m]
	midlayers 		= 2:maxlayers-1

	function derivative(T, step, position)
		if position == 1
			# This one-sided three point approximation is more accurate than (T[2] - T[1])/step.
			# It is O(step^2) instead of O(step).
			(-3*T[1] + 4*T[2] - T[3]) / (2*step)
		elseif position == length(T)
			# ditto
			(3*T[end] - 4*T[end-1] + T[end-2]) / (2*step)
		else
			# This central difference is actually also a three point approximation, and also O(step^2).
			(T[position+1] - T[position-1]) / (2*step)
		end
	end

	function secondderivative(T, step, position)
		# The position check is quite expensive, so let's comment it out and make sure we only call this in the interior.
		# If at the extremes, calculate from position one step inward.
		#position = clamp.(position, 2, length(T)-1)

		# This central three point approximation is also correct for the extreme left or right (if shifted inward one step).
		# It is O(step^2) in the interior and O(step) at the extremes.
		(T[position-1] - 2*T[position] + T[position+1]) / step^2
	end

	# Calculate ocean temperature using an upwelling-diffusion energy balance model.
	# Solve the advection-diffusion differential equation using explicit Euler finite differences.
	# The discretization is forward-in-time, central-in-space (FTCS).
	# The function does only one iteration of the time step but calculates temperature in all ocean layers (vectorized).
	global function temperatures!(s::ClimateState, p::ClimateParams)
		@unpack TotalRadiativeForcing, Temp, Temp_land, Temp_global = s
		@unpack timestep, lambda = p

		lambda_L = lambda
		lambda_O = lambda/marinewarming
		k_landocean = 1 # + b_L_O_exch - a_L_O_exch*lambda_L		#  land-ocean heat exchange coefficient [(W/m^2)/K]

		# We need some spatial derivatives of the temperature profile
		dz_Temp_1 = derivative(Temp, zstep, 1)
		dz_Temp = derivative(Temp, zstep, midlayers)
		dz2_Temp = secondderivative(Temp, zstep, midlayers)

		# First boundary condition (type Dirichlet):
		# Temp_mixed [°C]: temperature (change since preindustrial times) of mixed layer (i.e. surface ocean)
		Temp_mixed = Temp[1]

		# Temp_land [°C]: land temperature (change since preindustrial times)
		Temp_land = (TotalRadiativeForcing + k_landocean/(1-oceanarea)*marinewarming*Temp_mixed) /
						(1/lambda_L + k_landocean/(1-oceanarea))

		# heat transfer from land to ocean [W/m^2]
		Heatflux_land2ocean = k_landocean * (Temp_land - marinewarming*Temp_mixed)

		# heat transfer from mixed layer to deep ocean [W/m^2]
		Heatflux_mixed2deep = -rho*c*k * dz_Temp_1 - rho*c*w * (1-polarwaterratio) * Temp_mixed
		#Heatflux_mixed2deep = -rho*c*k * dz_Temp_1 - rho*c*w * (Temp[2] - polarwaterratio*Temp_mixed)

		# time derivative of temperature [°C/year]
		# timestep unit is [per year], so all time derivatives are also [per year]
		dt_Temp = Vector{Float64}(maxlayers)

		# Energy balance for the mixed layer
		dt_Temp[1] = secondsperyear / (rho*mixeddepth*c) *
			(TotalRadiativeForcing - Temp_mixed/lambda_O - Heatflux_mixed2deep + Heatflux_land2ocean/oceanarea)

		# Main advection-diffusion differential equation:
		# We could speed things up a tiny bit by assigning Temp[midlayers+1] and Temp[midlayers-1] to variables, but meh.
		dt_Temp[midlayers] = secondsperyear * (k * dz2_Temp + w * dz_Temp)

		# Temp [°C]: temperature change since preindustrial times in each ocean layer
		Temp[:] += timestep * dt_Temp

		# Second boundary condition (type Robin): approximate the derivative to get an equation for Temp[max]
		dz_Temp_max = w / k * (polarwaterratio*Temp_mixed - Temp[maxlayers])
		Temp[maxlayers] = Temp[maxlayers-1] + zstep * dz_Temp_max
		# more accurate approximation below, but accuracy is not important at ocean bottom
		#Temp[maxlayers] = -4*Temp[maxlayers-1] + Temp[maxlayers-2] + 2*3*zstep * dz_Temp_maxlayers

		# Temp_global [°C]: average land & ocean temperature change since preindustrial times
		Temp_global = marinewarming*oceanarea*Temp[1] + (1-oceanarea)*Temp_land

		@pack s = Temp, Temp_land, Temp_global
	end

	global function init_temperatures!(s::ClimateState)
		Temp = zeros(maxlayers)
		Temp_global = 0.0		
		Temp_land = 0.0
		@pack s = Temp, Temp_global, Temp_land
	end

	global function stabilitycheck(timestep)
		# Courant number, see p56 of Kajishima (2017), Computational Fluid Dynamics
		courant = w * timestep * secondsperyear / zstep

		# cell Reynolds number, see Kajishima p59-60
		reynolds = w * zstep / k

		# stability relation
		@assert courant <= min(reynolds/2, 2/reynolds) "Instable discretization of temperature differential equation, " *
			"try reducing timestep or increasing maxlayers."
	end
end