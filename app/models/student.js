const mongoose = require('mongoose')
const Schema = mongoose.Schema

const studentSchema = new Schema({
    email: { type: String, required: true, index: true, unique: true },
	phoneNumber: { type: String, required: true, index: true, unique: true },
	userId: { type: String, required: false, unique: true, index: true },
	firstName: { type: String, required: false },
	lastName: { type: String, required: false },
	userName: { type: String, required: false },
	dob: { type: Date, required: false },
	country: { type: String, required: false },
    createdBy: { type: Number },
	updatedBy: { type: Number },
})

studentSchema.pre('save',  function (next) {
    var now = new Date().getTime()
	if (!this.createdBy) {
		this.createdBy = now
		this.updatedBy = now
	} else {
		this.updatedBy = now
	}
	next()
})

const student = mongoose.model('student', studentSchema)
// student.createIndexes()
module.exports = student