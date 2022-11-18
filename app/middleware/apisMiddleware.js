function checkAccess(req, res, next, jsonApis) {
	let url = req.url
	url = url.replace('/api/', '')
	url = url.split('/')[0]
	url = url.split('?')[0]
	if (jsonApis.includes(url)) next()
	else {
		res.statusCode = 404
		return res.send({ message: 5068 })
	}
}

module.exports = checkAccess
