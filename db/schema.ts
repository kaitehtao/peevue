import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const reviews=sqliteTable('reviews',{
 id:text('id').primaryKey(),venueId:text('venue_id').notNull(),name:text('name').notNull(),rating:integer('rating').notNull(),body:text('body').notNull(),visited:text('visited').notNull(),createdAt:text('created_at').notNull(),photos:text('photos').notNull().default('[]')
},t=>[index('idx_reviews_created_at').on(t.createdAt),index('idx_reviews_venue_id').on(t.venueId)]);
