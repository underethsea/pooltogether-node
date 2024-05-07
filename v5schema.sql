--
-- PostgreSQL database dump
--

-- Dumped from database version 13.7 (Ubuntu 13.7-0ubuntu0.21.10.1)
-- Dumped by pg_dump version 13.7 (Ubuntu 13.7-0ubuntu0.21.10.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: claims; Type: TABLE; Schema: public; Owner: pooltogether
--

CREATE TABLE public.claims (
    network integer,
    block integer,
    hash character varying,
    draw integer,
    vault character varying,
    winner character varying,
    payout text,
    miner character varying,
    fee text,
    tier integer,
    index integer
);


ALTER TABLE public.claims OWNER TO pooltogether;

--
-- Name: draws; Type: TABLE; Schema: public; Owner: pooltogether
--

CREATE TABLE public.draws (
    id integer NOT NULL,
    network integer,
    draw integer,
    startedat timestamp without time zone,
    periodseconds integer,
    tiers integer,
    grandprizeperiod integer,
    tiervalues numeric[],
    prizeindices integer[],
    block integer
);


ALTER TABLE public.draws OWNER TO pooltogether;

--
-- Name: draws_id_seq; Type: SEQUENCE; Schema: public; Owner: pooltogether
--

CREATE SEQUENCE public.draws_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.draws_id_seq OWNER TO pooltogether;

--
-- Name: draws_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pooltogether
--

ALTER SEQUENCE public.draws_id_seq OWNED BY public.draws.id;


--
-- Name: pairs; Type: TABLE; Schema: public; Owner: pooltogether
--

CREATE TABLE public.pairs (
    vault character(42) NOT NULL,
    pair character(42) NOT NULL,
    name character varying(255) NOT NULL,
    symbol character varying(50) NOT NULL
);


ALTER TABLE public.pairs OWNER TO pooltogether;

--
-- Name: poolers; Type: TABLE; Schema: public; Owner: pooltogether
--

CREATE TABLE public.poolers (
    network integer,
    draw integer,
    pooler character varying,
    vault character varying,
    balance numeric
);


ALTER TABLE public.poolers OWNER TO pooltogether;

--
-- Name: v5claims; Type: TABLE; Schema: public; Owner: pooltogether
--

CREATE TABLE public.v5claims (
    network integer,
    block integer,
    hash character varying,
    draw integer,
    vault character varying,
    winner character varying,
    payout text,
    miner character varying,
    fee text,
    tier integer,
    index integer
);


ALTER TABLE public.v5claims OWNER TO pooltogether;

--
-- Name: wins; Type: TABLE; Schema: public; Owner: pooltogether
--

CREATE TABLE public.wins (
    win_id integer NOT NULL,
    network integer,
    draw integer,
    vault character varying,
    pooler character varying,
    tier integer,
    prizeindices integer[],
    claimedindices text[]
);


ALTER TABLE public.wins OWNER TO pooltogether;

--
-- Name: wins_win_id_seq; Type: SEQUENCE; Schema: public; Owner: pooltogether
--

CREATE SEQUENCE public.wins_win_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.wins_win_id_seq OWNER TO pooltogether;

--
-- Name: wins_win_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pooltogether
--

ALTER SEQUENCE public.wins_win_id_seq OWNED BY public.wins.win_id;


--
-- Name: draws id; Type: DEFAULT; Schema: public; Owner: pooltogether
--

ALTER TABLE ONLY public.draws ALTER COLUMN id SET DEFAULT nextval('public.draws_id_seq'::regclass);


--
-- Name: wins win_id; Type: DEFAULT; Schema: public; Owner: pooltogether
--

ALTER TABLE ONLY public.wins ALTER COLUMN win_id SET DEFAULT nextval('public.wins_win_id_seq'::regclass);


--
-- Name: draws draws_pkey; Type: CONSTRAINT; Schema: public; Owner: pooltogether
--

ALTER TABLE ONLY public.draws
    ADD CONSTRAINT draws_pkey PRIMARY KEY (id);


--
-- Name: wins wins_pkey; Type: CONSTRAINT; Schema: public; Owner: pooltogether
--

ALTER TABLE ONLY public.wins
    ADD CONSTRAINT wins_pkey PRIMARY KEY (win_id);


--
-- PostgreSQL database dump complete
--

