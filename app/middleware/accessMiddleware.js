function checkAccess(req, res, next, roles, jsonAccess) {
	let url = req.url
	url = url.replace('/api/', '')
	url = url.split('/')[0]
	url = url.split('?')[0]
	let method = req.method
	let role = req.decoded.role
	if (jsonAccess[roles[role]][method.toLowerCase()].includes(url)) next()
	else return res.send({ message: 5022 })
}

module.exports = checkAccess
