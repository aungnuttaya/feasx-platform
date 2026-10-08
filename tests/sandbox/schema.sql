-- Synthetic schema only; never a production migration. Run in the named,
-- network-disabled ephemeral container, not against a user-supplied URL.
CREATE ROLE sandbox_authenticated NOLOGIN;
CREATE ROLE sandbox_anon NOLOGIN;
CREATE SCHEMA sandbox;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA sandbox,auth TO sandbox_authenticated,sandbox_anon;
CREATE TABLE sandbox.usage_cycles(user_id uuid PRIMARY KEY,credits_remaining integer NOT NULL CHECK(credits_remaining>=0),reports_remaining integer NOT NULL CHECK(reports_remaining>=0));
CREATE TABLE sandbox.subscriptions(user_id uuid PRIMARY KEY,plan_id text NOT NULL);
CREATE TABLE sandbox.credit_transactions(user_id uuid NOT NULL,request_id uuid NOT NULL,remaining integer NOT NULL,PRIMARY KEY(user_id,request_id));
ALTER TABLE sandbox.usage_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sandbox.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_usage ON sandbox.usage_cycles TO sandbox_authenticated USING(user_id=auth.uid());
CREATE POLICY own_subscription ON sandbox.subscriptions TO sandbox_authenticated USING(user_id=auth.uid());
CREATE POLICY own_ledger ON sandbox.credit_transactions TO sandbox_authenticated USING(user_id=auth.uid());
GRANT SELECT ON sandbox.usage_cycles,sandbox.subscriptions,sandbox.credit_transactions TO sandbox_authenticated;
-- Anonymous can issue SELECT, but no applicable policy exposes any row.
GRANT SELECT ON sandbox.usage_cycles,sandbox.subscriptions,sandbox.credit_transactions TO sandbox_anon;
INSERT INTO sandbox.usage_cycles VALUES
('00000000-0000-4000-8000-000000000001',3,1),('00000000-0000-4000-8000-000000000002',2,1);
INSERT INTO sandbox.subscriptions VALUES
('00000000-0000-4000-8000-000000000001','synthetic-a'),('00000000-0000-4000-8000-000000000002','synthetic-b');
CREATE FUNCTION sandbox.consume_credit(p_request_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,sandbox AS $$
DECLARE actor uuid := auth.uid(); left_count integer;
BEGIN
 IF actor IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text || ':' || p_request_id::text,0));
 SELECT remaining INTO left_count FROM sandbox.credit_transactions WHERE user_id=actor AND request_id=p_request_id;
 IF FOUND THEN RETURN left_count; END IF;
 UPDATE sandbox.usage_cycles SET credits_remaining=credits_remaining-1 WHERE user_id=actor AND credits_remaining>0 RETURNING credits_remaining INTO left_count;
 IF NOT FOUND THEN RAISE EXCEPTION 'no_credits'; END IF;
 INSERT INTO sandbox.credit_transactions VALUES(actor,p_request_id,left_count);
 RETURN left_count;
END $$;
REVOKE ALL ON FUNCTION sandbox.consume_credit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sandbox.consume_credit(uuid) TO sandbox_authenticated;
