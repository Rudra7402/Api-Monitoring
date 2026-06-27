import validator from 'validator';

const validate = (data) => {

    const mandatoryField = ['username', 'email', 'password'];

    const IsAllowed = mandatoryField.every((k) => Object.keys(data).includes(k));

    if (!IsAllowed) {
        throw new Error("Some Field Missing");
    }

    if (!validator.isEmail(data.email)) {
        throw new Error("Invalid EmailId");
    }

    if (!validator.isStrongPassword(data.password)) {
        throw new Error("Weak Password");
    }
}

export default validate;