import moment from 'moment';

export const relativeTime = (date) => moment(date).fromNow();
