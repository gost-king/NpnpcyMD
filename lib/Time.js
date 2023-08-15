/**
 * Formats a timestamp into a custom format.
 * @param {Number} timestamp - The timestamp to format.
 * @param {String} format - The format string specifying the desired format (default: "NH, AH NB AT AJ:AM:AD").
 * @returns {String} - The formatted timestamp string.
 */
export function formatTimestamp(timestamp, format = "NH, AH NB AT AJ:AM:AD") {
	const date = new Date(timestamp)

	const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
	const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

	const replacements = {
		NH: days[date.getDay()],
		NB: months[date.getMonth()],
		AMD: date.getMilliseconds().toString().padStart(2, "0"),
		AD: date.getSeconds().toString().padStart(2, "0"),
		AM: date.getMinutes().toString().padStart(2, "0"),
		AJ: date.getHours().toString().padStart(2, "0"),
		AH: date.getDate(),
		AH0: date.getDate().toString().padStart(2, "0"),
		AB: date.getMonth() + 1,
		AB0: (date.getMonth() + 1).toString().padStart(2, "0"),
		AT: date.getFullYear()
	}

	let formattedDate = format
	for (const key in replacements) {
		formattedDate = formattedDate.replace(key, replacements[key])
	}

	return formattedDate
}

/**
 * Schedule a callback function to be executed after a specified time delay.
 * @param {String} time - The time delay in the format "X unit" (e.g., "10s" for 10 seconds).
 * @param {Function} callback - The callback function to be executed.
 * @returns {Object} - An object with the `delay` and `clear` properties.
 */
export async function timeout(time, callback) {
	const times = time.split(" ")
	const units = {
		d: 24 * 60 * 60 * 1000,
		h: 60 * 60 * 1000,
		m: 60 * 1000,
		s: 1000,
		ms: 1
	}
	const delay = times.reduce((totalDelay, t) => {
		const unit = t.slice(-1)
		const value = parseInt(t.slice(0, -1))
		if (!units[unit]) {
			throw new Error(`Invalid time unit: ${unit}`)
		}
		return totalDelay + value * units[unit]
	}, 0)

	const timeout = setTimeout(() => {
		callback()
	}, delay)

	return {
		delay: formatMilliseconds(delay),
		clear: () => clearTimeout(timeout)
	}
}

/**
 * Executes a callback function periodically at specified intervals based on the given time duration.
 * @param {String} time - The time duration in the format of space-separated time units (e.g., "2h 30m").
 * @param {Function} callback - The callback function to be executed at each interval.
 */
export async function periodic(time, callback) {
	const times = time.split(" ")
	const units = {
		d: 24 * 60 * 60 * 1000,
		h: 60 * 60 * 1000,
		m: 60 * 1000,
		s: 1000,
		ms: 1
	}
	const delay = times.reduce((totalDelay, t) => {
		const unit = t.slice(-1)
		const value = parseInt(t.slice(0, -1))
		if (!units[unit]) {
			throw new Error(`Invalid time unit: ${unit}`)
		}
		return totalDelay + value * units[unit]
	}, 0)
	setInterval(callback, delay)
}


function isValidCronPattern(cronPattern) {
  const cronParts = cronPattern.split(' ');
  const [minutes, hours, dayOfMonth, month] = cronParts;

  if (cronParts.length !== 4) {
    return false;
  }

  // Validasi menit
  if (minutes !== '*' && (parseInt(minutes) < 0 || parseInt(minutes) > 60)) {
    return false;
  }

  // Validasi jam
  if (hours !== '*' && (parseInt(hours) < 0 || parseInt(hours) > 24)) {
    return false;
  }

  // Validasi hari dalam bulan
  if (dayOfMonth !== '*') {
    const validDate = new Date(Date.UTC(new Date().getUTCFullYear(), parseInt(month) - 1, parseInt(dayOfMonth)));
    if (isNaN(validDate.getDate()) || validDate.getUTCDate() !== parseInt(dayOfMonth)) {
      return false;
    }
  }

  // Validasi bulan
  if (month !== '*' && (parseInt(month) < 0 || parseInt(month) > 12)) {
    return false;
  }

  return true;
}

export function schedule(cronPattern, callback) {
  if (!isValidCronPattern(cronPattern)) {
    throw new Error('Invalid cron pattern. Please check your input.');
  }

  setInterval(() => {
    const currentDate = new Date();
    const currentMinutes = currentDate.getMinutes().toString().padStart(2, '0');
    const currentHours = currentDate.getHours().toString().padStart(2, '0');
    const currentDayOfMonth = currentDate.getDate().toString().padStart(2, '0');
    const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');

    if (
      (cronPattern === '*' || cronPattern.startsWith(`${currentMinutes} `)) &&
      (cronPattern === '*' || cronPattern.includes(` ${currentHours} `)) &&
      (cronPattern === '*' || cronPattern.includes(` ${currentDayOfMonth} `)) &&
      (cronPattern === '*' || cronPattern.endsWith(` ${currentMonth}`))
    ) {
      callback();
    }
  }, 60000); // Check every minute
}

/**
 * Formats the given number of milliseconds into a human-readable string representation.
 * @param {number} milliseconds - The number of milliseconds to format.
 * @returns {string} - The formatted string representing the number of milliseconds.
 */
export function formatMilliseconds(milliseconds) {
	// Calculate the number of seconds, minutes, hours, and days from milliseconds
	const seconds = Math.floor((milliseconds / 1000) % 60)
	const minutes = Math.floor((milliseconds / (60 * 1000)) % 60)
	const hours = Math.floor((milliseconds / (60 * 60 * 1000)) % 24)
	const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000))

	// Construct the formatted string by concatenating the individual components
	const formattedMilliseconds =
		(days ? `${days} days ` : "") +
		(hours ? `${hours} hours ` : "") +
		(minutes ? `${minutes} minutes ` : "") +
		(seconds ? `${seconds} seconds` : "")

	return formattedMilliseconds.trim()
}